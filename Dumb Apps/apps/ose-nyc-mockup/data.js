window.oseProjects = [
  {
    slug: "induction-stove",
    name: "Induction Stove",
    image: "images/Induction Stove.png",
    alt: "A sketch of an induction stove concept with four burners.",
    discipline: "Cooking",
    summary: "An induction range concept aimed at readable electronics, modular burners, and tractable documentation.",
    stage: "Concept",
    progressIndex: 0,
    progressLabel: "Concept",
    links: [
      "Join the Conversation",
      "Documentation stored on Google Drive",
      {
        label: "Collaborate on Mechanical",
        href: "https://github.com/tcoor8325/freecad-collab",
        icon: "onshape",
        helpVideo: "https://www.youtube.com/embed/aqz-KE-bpKQ"
      },
      "Collaborate on Electronics",
      "Collaborate on Software"
    ],
    taskPanel: {
      title: "Open Tasks",
      note: "",
      sections: [
        {
          title: "Software",
          entries: [
            {
              title: "Draft the burner-state mock logic.",
              body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
              status: "Next",
              owner: "Software"
            }
          ]
        },
        {
          title: "Mechanical",
          entries: [
            {
              title: "Revise the coil enclosure bracket layout.",
              body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.",
              status: "Needs Review",
              owner: "Mechanical"
            }
          ]
        },
        {
          title: "Electrical",
          entries: [
            {
              title: "Map a cleaner sensor and power routing pass.",
              body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, nisi ut aliquip ex ea commodo consequat duis aute irure dolor.",
              status: "Ready",
              owner: "Electrical"
            }
          ]
        },
        {
          title: "General",
          entries: [
            {
              title: "Break the range into serviceable modules.",
              body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
            },
            {
              title: "Decide what can be standardized across burners.",
              body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip."
            },
            {
              title: "Collect safety constraints for enclosure spacing.",
              body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore."
            },
            {
              title: "Write the first one-page concept note.",
              body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia."
            }
          ]
        }
      ]
    },
    timeline: {
      Software: [
        ["Mar 08", "Drafted a tiny power-level UI flow."],
        ["Mar 01", "Captured likely firmware states for burner pairing."]
      ],
      Mechanical: [
        ["Mar 07", "Outlined chassis zones around the coil packs."],
        ["Feb 25", "Listed the enclosure panels that must be user-removable."]
      ],
      Electrical: [
        ["Mar 09", "Started comparing off-the-shelf sensing approaches."],
        ["Feb 24", "Documented the first safety and isolation questions."]
      ]
    },
    updatesPanel: {
      title: "Build Journal",
      note: "",
      entries: [
        {
          meta: "Week 11",
          title: "Module Map Pass",
          image: "images/journal_1.png",
          alt: "The first induction stove journal sketch.",
          body: "This project is still mostly concept work, but the module map is improving. Burner zones, control surfaces, and service panels are starting to look like separate problems instead of one giant appliance blob."
        },
        {
          meta: "Week 10",
          title: "Swappable Coil Direction",
          image: "images/Journal_2.png",
          alt: "The second induction stove journal sketch.",
          body: "A useful discovery was that several enclosure ideas became much simpler once the coil packs were treated as swappable units. That change also made the eventual documentation story less chaotic."
        },
        {
          meta: "Week 09",
          title: "Tiny UI Flow",
          image: "images/Journal_3.png",
          alt: "The third induction stove journal sketch.",
          body: "The software side is intentionally tiny right now, mostly just a made-up state flow for burner pairing, power level stepping, and safety lockouts that gives the rest of the team something concrete to react to."
        },
        {
          meta: "Week 08",
          title: "Isolation Questions",
          image: "images/Journal_4.png",
          alt: "The fourth induction stove journal sketch.",
          body: "Electrical notes expanded with questions about sensing, isolation, and connector access. None of the answers are final, but the project is better because those questions are visible early."
        },
        {
          meta: "Week 07",
          title: "Panel Access Review",
          image: "images/Journal_5.png",
          alt: "The fifth induction stove journal sketch.",
          body: "Next week should produce a one-page concept brief, decide which panels must come off without tools, and narrow the chassis layout to one direction that can survive deeper design work."
        },
        {
          meta: "Week 06",
          title: "Journal Catch-Up",
          image: "images/Journal_6.png",
          alt: "The sixth induction stove journal sketch.",
          body: "Collected the sketch set into the build journal so the page shows distinct hardware snapshots instead of repeating the same render. The concept is still loose, but the visual history is now easier to scan."
        }
      ]
    }
  },
  {
    slug: "water-boiler",
    name: "Water Boiler",
    image: "images/Water Boiler.png",
    alt: "A sketch of a countertop water boiler concept.",
    discipline: "Appliance",
    summary: "A documented water boiler with simple stages, open collaboration links, and weekly work notes.",
    stage: "Prototype 2",
    progressIndex: 2,
    progressLabel: "P2",
    links: [
      "Join the Conversation",
      "Documentation stored on Google Drive",
      "Collaborate on Mechanical",
      "Collaborate on Electronics",
      "Collaborate on Software"
    ],
    taskPanel: {
      title: "Open Tasks",
      note: "",
      sections: [
        {
          title: "Software",
          entries: [
            {
              title: "Sketch the keep-warm control flow.",
              body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
              status: "Next",
              owner: "Software"
            }
          ]
        },
        {
          title: "Mechanical",
          entries: [
            {
              title: "Clean up the lid hinge service path.",
              body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.",
              status: "Needs Review",
              owner: "Mechanical"
            }
          ]
        },
        {
          title: "Electrical",
          entries: [
            {
              title: "Rework the heater and sensor connector plan.",
              body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, nisi ut aliquip ex ea commodo consequat duis aute irure dolor.",
              status: "Ready",
              owner: "Electrical"
            }
          ]
        },
        {
          title: "General",
          entries: [
            {
              title: "Reduce part count in the top lid assembly.",
              body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
            },
            {
              title: "Move the thermal cutoff into a clearer service position.",
              body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip."
            },
            {
              title: "Write a first calibration checklist.",
              body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore."
            },
            {
              title: "List the firmware edge cases around dry-boil detection.",
              body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia."
            }
          ]
        }
      ]
    },
    timeline: {
      Software: [
        ["Mar 13", "Added a keep-warm timing mock-up and status labels."],
        ["Mar 03", "Listed the first safety fallback states."]
      ],
      Mechanical: [
        ["Mar 12", "Rebuilt the lid hinge around a simpler stamped bracket."],
        ["Mar 05", "Adjusted the internal tank shell for easier cleaning."]
      ],
      Electrical: [
        ["Mar 10", "Moved temperature sensing closer to the heater path."],
        ["Mar 01", "Started a cleaner schematic for the power board."]
      ]
    },
    updates: [
      ["Week 11", "Prototype two is mostly about making the inside less annoying to service. The lid hinge got simpler, the thermal cutoff moved to a clearer spot, and the top assembly dropped a few needless parts."],
      ["Week 10", "One good discovery was that removing decorative enclosure flourishes made the whole product easier to explain, easier to open, and less likely to hide fasteners where no one wants them."],
      ["Week 09", "Firmware notes now include a dry-boil edge-case list, a keep-warm timing sketch, and a few open questions around how much calibration should happen at the factory versus in the field."],
      ["Week 08", "Documentation is still catching up after the recent CAD churn, but the schematic is cleaner and the service checklist is turning into something another person could realistically follow."],
      ["Week 07", "This coming week should confirm the lid assembly, tighten the calibration checklist, and decide whether the tank shell needs one more revision before the next prototype build."]
    ]
  }
];

window.oseStageNames = ["Concept", "Design", "Prototype", "Finished Good"];
