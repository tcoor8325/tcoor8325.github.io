export const TRIBAL_FIRST_NAMES = [
    "Ari",
    "Koa",
    "Mira",
    "Rin",
    "Sage",
    "Tala",
    "Niko",
    "Lena",
    "Cian",
    "Vera",
    "Oren",
    "Nari",
    "Bryn",
    "Edda",
    "Sora",
    "Iven",
    "Kael",
    "Lyra",
    "Toren",
    "Zia"
];
export const TRIBAL_LAST_NAMES = [
    "Stonebrook",
    "Riverwind",
    "Mossfield",
    "Ashvale",
    "Pinewatch",
    "Frostmere",
    "Redcliff",
    "Willowmarch",
    "Oakshield",
    "Brightwater",
    "Moonridge",
    "Greenbarrow",
    "Greyford",
    "Hollowbranch",
    "Sunplain",
    "Deepgrove",
    "Dawntrail",
    "Ironreed",
    "Stormhollow",
    "Emberfall"
];
const randomIndex = (max) => {
    return Math.floor(Math.random() * max);
};
export const generateRandomTribalGovernorName = () => {
    const first = TRIBAL_FIRST_NAMES[randomIndex(TRIBAL_FIRST_NAMES.length)];
    const last = TRIBAL_LAST_NAMES[randomIndex(TRIBAL_LAST_NAMES.length)];
    return `${first} ${last}`;
};
