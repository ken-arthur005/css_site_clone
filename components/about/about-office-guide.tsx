"use client";

import { useState } from "react";
import type { AboutHelpTopic, AboutOffice } from "@/types/about";

export function AboutOfficeGuide({ topics, offices }: { topics: readonly AboutHelpTopic[]; offices: readonly AboutOffice[] }) {
  const [selected, setSelected] = useState(topics[0]?.id ?? "");
  const topic = topics.find(({ id }) => id === selected);
  const office = offices.find(({ id }) => id === topic?.officeId);
  if (!topic || !office) return null;

  return (
    <div className="about-help">
      <div className="about-help__questions">
        <label htmlFor="about-help-select" className="about-label">What do you need help with?</label>
        <select id="about-help-select" value={selected} onChange={(event) => setSelected(event.target.value)}>{topics.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
        <div className="about-help__buttons" role="group" aria-label="Choose a department enquiry">
          {topics.map((item, index) => <button key={item.id} type="button" aria-pressed={selected === item.id} aria-controls="about-help-answer" onClick={() => setSelected(item.id)}><span className="about-label">0{index + 1}</span>{item.label}<span aria-hidden="true">↗</span></button>)}
        </div>
      </div>
      <div id="about-help-answer" className="about-help__answer" aria-live="polite" aria-atomic="true">
        <p className="about-label">Your next stop</p>
        <div className="about-help__destination"><span>{office.room}</span><div><h3>{office.name}</h3><p>{office.location}</p></div></div>
        <ol>{topic.steps.map((step) => <li key={step}>{step}</li>)}</ol>
        <p className="about-help__note">{topic.note}</p>
        <a className="about-text-link" href={`#office-${office.id}`}>See this office’s full guide <span aria-hidden="true">↗</span></a>
      </div>
    </div>
  );
}
