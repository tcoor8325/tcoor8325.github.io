const result = document.querySelector("#result");
const randomizeButton = document.querySelector("#randomize");

const fallbackStartups = [
  "SpaceX", "Tesla", "Facebook", "LinkedIn", "YouTube", "Reddit", "Twitter",
  "Spotify", "Airbnb", "Uber", "Dropbox", "WhatsApp", "Pinterest", "Stripe",
  "Instagram", "Slack", "GitHub", "Shopify", "Etsy", "Notion", "Figma",
  "Discord", "Canva", "Robinhood", "DoorDash", "Coinbase", "Zoom", "OpenAI",
  "Anthropic", "Vercel", "Cloudflare", "Duolingo", "Twitch", "Snap",
];

const fallbackUsers = [
  "Doctors", "Engineers", "Teachers", "Chefs", "Pilots", "Nurses",
  "Firefighters", "Lawyers", "Farmers", "Software Developers",
  "Data Scientists", "UX Designers", "Content Creators", "Freelancers",
  "Mothers", "Fathers", "Pregnant Women", "Babies", "Teenagers",
  "The Elderly", "College Students", "Retirees", "Veterans", "Commuters",
  "Billionaires", "Working Class", "People with Disabilities", "Caregivers",
];

const sectionHeaders = new Set([
  "professions", "classes and types of people", "demographics", "animals",
  "religions", "disabilities and conditions",
]);

const parseList = (text) =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !sectionHeaders.has(line.toLowerCase()))
    .filter((line) => !line.startsWith("#"));

const pickOne = (list) => list[Math.floor(Math.random() * list.length)];

let startups = [];
let users = [];

const updatePitch = () => {
  if (!startups.length || !users.length) {
    result.textContent = '"Still loading..."';
    return;
  }

  result.textContent = `"It's like ${pickOne(startups)}, but for ${pickOne(users)}!"`;
};

const loadLists = async () => {
  try {
    const [startupRes, userRes] = await Promise.all([
      fetch("../../startups.md"),
      fetch("../../users.md"),
    ]);

    if (!startupRes.ok || !userRes.ok) throw new Error("Failed to load lists");

    const [startupText, userText] = await Promise.all([
      startupRes.text(),
      userRes.text(),
    ]);

    startups = parseList(startupText);
    users = parseList(userText);

    if (!startups.length || !users.length) throw new Error("Lists were empty");
  } catch {
    startups = fallbackStartups;
    users = fallbackUsers;
  }
};

const init = async () => {
  await loadLists();
  randomizeButton.disabled = false;
  randomizeButton.textContent = "Disrupt!!";
  updatePitch();
};

randomizeButton.addEventListener("click", updatePitch);

init();
