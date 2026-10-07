import type { HomeAboutContent, HomeCommunityPhoto, HomeQuote } from "@/types/home";

// Existing homepage quotations, retained in the owner-approved sequence.
export const homeQuotes: { leadership: HomeQuote; events: HomeQuote } = {
  leadership: { author: "Linus Torvalds", quote: "Talk is cheap. Show me the code." },
  events: { author: "Steve Jobs", quote: "Everybody in this country should learn how to program a computer, because it teaches you how to think." },
};

function photo(folder: string, file: string, position?: string): HomeCommunityPhoto {
  return { id: file, src: `/about/${folder}/${encodeURIComponent(file)}`, position };
}

export const homeAboutContent: HomeAboutContent = {
  headingLines: ["A society", "shaped by computing"],
  // Fixed editorial selection, not render-time randomness. The first six were
  // unused when this wall was added; mobile uses the first eighteen images.
  // Decorative photographs carry no new names, dates, or public claims.
  communityPhotos: [
    photo("learning", "learning.jpg"),
    photo("life", "life5_repyourschool.jpg"),
    photo("sports", "sports7_iconicpic.JPG"),
    photo("life", "life7_repyourjersey.JPG"),
    photo("sports", "sport1_coachandplayer.JPG"),
    photo("sports", "sports1_reigningchamps.JPG"),
    photo("community", "community2.jpg"),
    photo("learning", "learning3.jpg"),
    photo("sports", "sports3_thefans.JPG"),
    photo("life", "life1_dinner night.jpg"),
    photo("learning", "learning4.jpg"),
    photo("community", "community3.JPG"),
    photo("sports", "sports6_match action.JPG", "center 70%"),
    photo("life", "life2_movienight.jpg"),
    photo("learning", "learning1_hackathon.jpg"),
    photo("community", "community.jpg", "center 63%"),
    photo("sports", "sports8_shoottheball.JPG", "center 62%"),
    photo("learning", "learning6.jpg"),
    photo("community", "community1.jpg"),
    photo("life", "life4_repyourschool.jpg"),
    photo("learning", "learning2.jpg"),
    photo("sports", "sports2_trophylift.JPG"),
    photo("learning", "learning5.jpg"),
    photo("life", "life3_movienight.jpg"),
  ],
  careerPaths: [
    { id: "cybersecurity", name: "Cybersecurity", description: "Keep intruders out. “password123” is not a strategy." },
    { id: "data-science", name: "Data Science", description: "Turn messy data into answers. The spreadsheet has trust issues." },
    { id: "ui-ux", name: "UI/UX Design", description: "Make it usable. If the button needs a tutorial, we need to talk." },
    { id: "software-engineering", name: "Software Engineering", description: "Build things that work. Then explain why they stopped." },
    { id: "ai-ml", name: "AI/ML Engineering", description: "Train models. Try not to teach them your bad habits." },
    { id: "cloud-engineering", name: "Cloud Engineering", description: "Deploy beyond your laptop. “Works on my machine” has left the chat." },
    { id: "devops", name: "DevOps", description: "Make deployments boring. Keep the group chat dramatic." },
  ],
  terminal: {
    title: "css@knust — paths",
    prompt: "css@knust:~$",
    command: "./choose-your-path",
  },
};
