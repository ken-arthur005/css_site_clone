"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useEffect, useRef } from "react";
import Typed from "typed.js";
import { useNavigationState } from "@/components/providers/navigation-state-provider";
import type { HomeCareerPath, HomeTerminalContent } from "@/types/home";

gsap.registerPlugin(useGSAP);

type CareerTerminalProps = {
  paths: readonly HomeCareerPath[];
  terminal: HomeTerminalContent;
};

export function HomeCareerTerminal({ paths, terminal }: CareerTerminalProps) {
  const rootRef = useRef<HTMLElement>(null);
  const commandRef = useRef<HTMLSpanElement>(null);
  const commandPrefixRef = useRef<HTMLSpanElement>(null);
  const blockedRef = useRef(false);
  const syncPlaybackRef = useRef(() => {});
  const { isMenuActive } = useNavigationState();

  useEffect(() => {
    blockedRef.current = isMenuActive;
    syncPlaybackRef.current();
  }, [isMenuActive]);

  useGSAP(() => {
    const root = rootRef.current;
    const command = commandRef.current;
    const commandPrefix = commandPrefixRef.current;
    const frame = root?.querySelector<HTMLElement>(".home-terminal__frame");
    if (!root || !command || !commandPrefix || !frame) return;
    const rows = Array.from(root.querySelectorAll<HTMLElement>(".home-terminal__row"));
    const footer = root.querySelector<HTMLElement>(".home-terminal__footer");
    const visualTexts = Array.from(root.querySelectorAll<HTMLElement>("[data-terminal-text]"));
    const indices = Array.from(root.querySelectorAll<HTMLElement>(".home-terminal__index"));
    let started = false;
    let finished = false;
    let startedAt = 0;
    let commandComplete = false;
    let typed: Typed | null = null;

    command.textContent = "";
    commandPrefix.textContent = "";
    visualTexts.forEach((element) => { element.textContent = ""; });
    gsap.set(indices, { opacity: 0 });
    gsap.set(footer, { autoAlpha: 0 });
    root.dataset.playback = "waiting";

    const output = gsap.timeline({
      paused: true,
      onComplete: () => {
        finished = true;
        root.dataset.playback = "complete";
        root.dataset.typingDuration = String(Math.round(performance.now() - startedAt));
      },
    });
    rows.forEach((row, index) => {
      const name = row.querySelector<HTMLElement>("[data-terminal-name]");
      const description = row.querySelector<HTMLElement>("[data-terminal-description]");
      const number = row.querySelector<HTMLElement>(".home-terminal__index");
      if (!name || !description || !number) return;
      const path = paths[index];
      const progress = { count: 0 };
      let previousCount = -1;
      output.set(number, { opacity: 1 })
        .to(progress, {
          count: path.name.length + path.description.length,
          duration: 0.24,
          ease: "none",
          onUpdate: () => {
            const count = Math.floor(progress.count);
            if (count === previousCount) return;
            previousCount = count;
            // A bounded burst per frame keeps seven full descriptions fast,
            // rather than stacking hundreds of character-level timeout calls.
            name.textContent = path.name.slice(0, count);
            description.textContent = path.description.slice(0, Math.max(0, count - path.name.length));
          },
        });
    });
    output.to(footer, { autoAlpha: 1, duration: 0.14 });

    const finishCommand = () => {
      typed?.destroy();
      typed = null;
      commandPrefix.textContent = terminal.command;
      command.textContent = "";
      commandComplete = true;
      sync();
    };
    const typeCommand = () => {
      const remaining = terminal.command.slice((commandPrefix.textContent ?? "").length);
      if (!remaining) { finishCommand(); return; }
      typed = new Typed(command, {
        strings: [remaining], typeSpeed: 18,
        startDelay: commandPrefix.textContent ? 0 : 80,
        showCursor: false, autoInsertCss: false, contentType: "null",
        onComplete: finishCommand,
      });
    };
    const sync = () => {
      const bounds = frame.getBoundingClientRect();
      const visible = bounds.bottom > 0 && bounds.top < window.innerHeight * 0.88;
      const running = visible && !blockedRef.current && !document.hidden;
      root.dataset.running = String(running);
      if (finished) return;
      if (running) {
        if (!started) {
          started = true;
          startedAt = performance.now();
          root.dataset.playback = "typing";
        }
        if (!commandComplete && !typed) typeCommand();
        else if (commandComplete) output.resume();
      } else {
        if (typed) {
          const printed = (commandPrefix.textContent ?? "") + (command.textContent ?? "");
          typed.destroy();
          typed = null;
          commandPrefix.textContent = printed;
        }
        output.pause();
      }
    };
    syncPlaybackRef.current = sync;
    // A percentage of the whole terminal can become unreachable on a narrow
    // phone or with enlarged text. Use viewport entry, not total output height.
    const observer = new IntersectionObserver(sync, { threshold: 0 });
    observer.observe(frame);
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("pageshow", sync);
    sync();

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("scroll", sync);
      window.removeEventListener("pageshow", sync);
      syncPlaybackRef.current = () => {};
      typed?.destroy();
      commandPrefix.textContent = terminal.command;
      command.textContent = "";
      rows.forEach((row, index) => {
        const name = row.querySelector<HTMLElement>("[data-terminal-name]");
        const description = row.querySelector<HTMLElement>("[data-terminal-description]");
        if (name) name.textContent = paths[index].name;
        if (description) description.textContent = paths[index].description;
      });
      delete root.dataset.playback;
      delete root.dataset.running;
      delete root.dataset.typingDuration;
    };
  }, { scope: rootRef, dependencies: [paths, terminal], revertOnUpdate: true });

  return <section className="home-career-terminal" aria-labelledby="home-career-paths-heading" ref={rootRef}>
    <header className="home-career-terminal__heading">
      <h2 id="home-career-paths-heading">choose your path</h2>
    </header>
    <div className="home-terminal__frame">
      <div className="home-terminal__titlebar" aria-hidden="true">
        <span className="home-terminal__window-title"><span className="home-terminal__icon">&gt;_</span>{terminal.title}</span>
        <span className="home-terminal__window-controls"><span>—</span><span>□</span><span>×</span></span>
      </div>
      <div className="home-terminal__body">
        <p className="home-terminal__command">
          <span className="home-terminal__prompt">{terminal.prompt}</span>
          <span className="home-terminal__cell">
            <span className="home-terminal__source">{terminal.command}</span>
            <span aria-hidden="true" className="home-terminal__visual"><span ref={commandPrefixRef}>{terminal.command}</span><span ref={commandRef} /></span>
          </span>
        </p>
        <dl className="home-terminal__output">
          {paths.map((path, index) => <div className="home-terminal__row" key={path.id}>
            <dt className="home-terminal__name">
              <span className="home-terminal__index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <span className="home-terminal__cell">
                <span className="home-terminal__source">{path.name}</span>
                <span className="home-terminal__visual" aria-hidden="true" data-terminal-name data-terminal-text>{path.name}</span>
              </span>
            </dt>
            <dd className="home-terminal__cell">
              <span className="home-terminal__source">{path.description}</span>
              <span className="home-terminal__visual" aria-hidden="true" data-terminal-description data-terminal-text>{path.description}</span>
            </dd>
          </div>)}
        </dl>
        <div className="home-terminal__footer">
          <p className="home-terminal__status">{paths.length} paths loaded.</p>
          <p className="home-terminal__ready" aria-hidden="true"><span className="home-terminal__prompt">{terminal.prompt}</span><span className="home-terminal__caret" /></p>
        </div>
      </div>
    </div>
  </section>;
}
