"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { Box3, Group, MathUtils, PerspectiveCamera, Vector2, Vector3, type Intersection } from "three";

export type ShirtSurfaceSize = { width: number; height: number };
export type ShirtCanvasFrame = ShirtSurfaceSize & { referenceWidth: number; referenceHeight: number };

type Props = {
  modelRef: RefObject<Group | null>;
  surface: ShirtSurfaceSize;
  active: boolean;
  autoRotate: boolean;
  label: string;
  onFrame: (frame: ShirtCanvasFrame) => void;
  onInteractionStart: () => void;
  onInteractionEnd: () => void;
};

const MAX_TILT = Math.PI * 0.13;
const MOUSE_MARGIN = 16;
const TOUCH_MARGIN = 24;
const NEAR_OFFSETS = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [.707, .707], [-.707, .707], [.707, -.707], [-.707, -.707]];

type Gesture = {
  id: number;
  touch: boolean;
  originX: number;
  originY: number;
  lastX: number;
  lastY: number;
  locked: boolean;
  cancelled: boolean;
};

export function ShirtProximityControls({ modelRef, surface, active, autoRotate, label, onFrame, onInteractionStart, onInteractionEnd }: Props) {
  const { get, invalidate, size } = useThree();
  const gestureRef = useRef<Gesture | null>(null);
  const activeRef = useRef(active);
  const autoRotateRef = useRef(autoRotate);
  const callbacksRef = useRef({ onInteractionStart, onInteractionEnd });
  const endRef = useRef(() => {});

  useLayoutEffect(() => {
    activeRef.current = active;
    autoRotateRef.current = autoRotate;
    callbacksRef.current = { onInteractionStart, onInteractionEnd };
    if (!active) endRef.current();
  }, [active, autoRotate, onInteractionStart, onInteractionEnd]);

  useLayoutEffect(() => {
    const { camera } = get();
    const model = modelRef.current;
    if (!model || !(camera instanceof PerspectiveCamera) || !surface.width || !surface.height) return;

    // Start with the original full-stage camera. setViewOffset then crops that
    // render window instead of making the garment smaller in a smaller canvas.
    camera.clearViewOffset();
    camera.aspect = surface.width / surface.height;
    camera.zoom = 1;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    const rotation = model.rotation.clone();
    model.rotation.set(0, 0, 0, "YXZ");
    model.updateWorldMatrix(true, true);
    const bounds = new Box3().setFromObject(model);
    model.rotation.copy(rotation);
    model.updateWorldMatrix(true, true);
    if (bounds.isEmpty()) return;

    const corners: Vector3[] = [];
    for (const x of [bounds.min.x, bounds.max.x]) {
      for (const y of [bounds.min.y, bounds.max.y]) {
        for (const z of [bounds.min.z, bounds.max.z]) corners.push(new Vector3(x, y, z));
      }
    }
    const point = new Vector3();
    let halfWidth = 0;
    let halfHeight = 0;
    const touch = window.matchMedia("(pointer: coarse)").matches;
    // Front/back share these bounds. A small render gutter allows the existing
    // desktop tilt without a large all-angle sphere or a smaller garment.
    for (const corner of corners) {
      point.copy(corner).project(camera);
      halfWidth = Math.max(halfWidth, Math.abs(point.x) * surface.width / 2);
      halfHeight = Math.max(halfHeight, Math.abs(point.y) * surface.height / 2);
    }
    const padding = touch ? TOUCH_MARGIN : 40;
    const width = Math.min(surface.width, Math.ceil(halfWidth * 2 + padding * 2));
    const height = Math.min(surface.height, Math.ceil(halfHeight * 2 + padding * 2));
    camera.setViewOffset(surface.width, surface.height, (surface.width - width) / 2, (surface.height - height) / 2, width, height);
    camera.updateProjectionMatrix();
    onFrame({ width, height, referenceWidth: surface.width, referenceHeight: surface.height });
    invalidate();
  }, [get, invalidate, modelRef, onFrame, size.width, size.height, surface.width, surface.height]);

  useEffect(() => {
    const { camera, gl, raycaster } = get();
    const canvas = gl.domElement;
    const pointer = new Vector2();
    const intersections: Intersection[] = [];
    const previousTouchAction = canvas.style.touchAction;
    const previousCursor = canvas.style.cursor;
    const previousTabIndex = canvas.getAttribute("tabindex");
    const previousRole = canvas.getAttribute("role");
    const previousLabel = canvas.getAttribute("aria-label");
    canvas.style.touchAction = "pan-y pinch-zoom";
    canvas.style.cursor = "auto";
    canvas.tabIndex = 0;
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", label);
    canvas.dataset.shirtGesture = "idle";

    const closeToShirt = (x: number, y: number, touch: boolean) => {
      const model = modelRef.current;
      if (!model || !activeRef.current) return false;
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height || x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return false;
      model.updateWorldMatrix(true, true);
      const margin = touch ? TOUCH_MARGIN : MOUSE_MARGIN;
      for (const [dx, dy] of NEAR_OFFSETS) {
        pointer.set(((x + dx * margin - rect.left) / rect.width) * 2 - 1, -((y + dy * margin - rect.top) / rect.height) * 2 + 1);
        raycaster.setFromCamera(pointer, camera);
        intersections.length = 0;
        raycaster.intersectObject(model, true, intersections);
        if (intersections.length) return true;
      }
      return false;
    };
    const release = (id: number) => {
      if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    };
    const end = () => {
      const gesture = gestureRef.current;
      if (!gesture) return;
      gestureRef.current = null;
      release(gesture.id);
      canvas.dataset.shirtGesture = "idle";
      canvas.style.cursor = "auto";
      if (gesture.locked) callbacksRef.current.onInteractionEnd();
    };
    const cancel = () => {
      const gesture = gestureRef.current;
      if (!gesture || gesture.cancelled) return;
      gesture.cancelled = true;
      canvas.dataset.shirtGesture = "cancelled";
      canvas.style.cursor = "auto";
      release(gesture.id);
      // Stay paused until the original press ends: moving an already-held
      // pointer back over the garment cannot resume rotation or cause a jump.
    };
    endRef.current = end;
    const start = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0 || !activeRef.current || gestureRef.current) return;
      const touch = event.pointerType !== "mouse";
      if (!closeToShirt(event.clientX, event.clientY, touch)) return;
      gestureRef.current = {
        id: event.pointerId, touch, originX: event.clientX, originY: event.clientY,
        lastX: event.clientX, lastY: event.clientY, locked: !touch, cancelled: false,
      };
      canvas.dataset.shirtGesture = touch ? "pending" : "dragging";
      if (!touch) {
        callbacksRef.current.onInteractionStart();
        canvas.setPointerCapture(event.pointerId);
        canvas.style.cursor = "grabbing";
        canvas.focus({ preventScroll: true });
      }
    };
    const move = (event: PointerEvent) => {
      const gesture = gestureRef.current;
      if (!gesture) {
        if (event.pointerType === "mouse") canvas.style.cursor = closeToShirt(event.clientX, event.clientY, false) ? "grab" : "auto";
        return;
      }
      if (event.pointerId !== gesture.id || gesture.cancelled) return;
      const totalX = event.clientX - gesture.originX;
      const totalY = event.clientY - gesture.originY;
      if (!gesture.locked) {
        if (Math.max(Math.abs(totalX), Math.abs(totalY)) < 8) return;
        if (Math.abs(totalX) <= Math.abs(totalY) * 1.2) { cancel(); return; }
        gesture.locked = true;
        canvas.dataset.shirtGesture = "dragging";
        callbacksRef.current.onInteractionStart();
        canvas.setPointerCapture(event.pointerId);
      }
      if (!closeToShirt(event.clientX, event.clientY, gesture.touch)) { cancel(); return; }
      const model = modelRef.current;
      if (!model) return;
      const rect = canvas.getBoundingClientRect();
      model.rotation.order = "YXZ";
      model.rotation.y += (event.clientX - gesture.lastX) * Math.PI * 1.4 / rect.height;
      if (!gesture.touch) model.rotation.x = MathUtils.clamp(model.rotation.x + (event.clientY - gesture.lastY) * Math.PI * 0.7 / rect.height, -MAX_TILT, MAX_TILT);
      gesture.lastX = event.clientX;
      gesture.lastY = event.clientY;
      canvas.dataset.shirtYaw = model.rotation.y.toFixed(6);
      canvas.dataset.shirtTilt = model.rotation.x.toFixed(6);
      invalidate();
    };
    const finish = (event: PointerEvent) => {
      if (gestureRef.current?.id === event.pointerId) end();
    };
    const leave = () => {
      if (gestureRef.current) cancel();
      else canvas.style.cursor = "auto";
    };
    const multiTouch = (event: PointerEvent) => {
      if (gestureRef.current && event.pointerType !== "mouse" && event.pointerId !== gestureRef.current.id) cancel();
    };
    const keydown = (event: KeyboardEvent) => {
      if (!activeRef.current || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return;
      const model = modelRef.current;
      if (!model) return;
      event.preventDefault();
      callbacksRef.current.onInteractionStart();
      model.rotation.order = "YXZ";
      model.rotation.y += (event.key === "ArrowRight" ? 1 : -1) * Math.PI / 12;
      canvas.dataset.shirtYaw = model.rotation.y.toFixed(6);
      invalidate();
      callbacksRef.current.onInteractionEnd();
    };
    canvas.addEventListener("pointerdown", start);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerleave", leave);
    canvas.addEventListener("keydown", keydown);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    window.addEventListener("pointerdown", multiTouch, { passive: true });
    return () => {
      end();
      endRef.current = () => {};
      canvas.removeEventListener("pointerdown", start);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerleave", leave);
      canvas.removeEventListener("keydown", keydown);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      window.removeEventListener("pointerdown", multiTouch);
      canvas.style.touchAction = previousTouchAction;
      canvas.style.cursor = previousCursor;
      const attributes: [string, string | null][] = [["tabindex", previousTabIndex], ["role", previousRole], ["aria-label", previousLabel]];
      for (const [attribute, value] of attributes) {
        if (value === null) canvas.removeAttribute(attribute);
        else canvas.setAttribute(attribute, value);
      }
      delete canvas.dataset.shirtGesture;
      delete canvas.dataset.shirtYaw;
      delete canvas.dataset.shirtTilt;
    };
  }, [get, invalidate, label, modelRef]);

  useFrame((_, delta) => {
    const model = modelRef.current;
    if (model && activeRef.current && autoRotateRef.current && !gestureRef.current) {
      model.rotation.order = "YXZ";
      model.rotation.y += Math.min(delta, 0.05) * Math.PI * 2 / 60 * 0.32;
    }
  });

  return null;
}
