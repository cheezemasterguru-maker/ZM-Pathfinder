window.ZM_MAPS = {
  Main: {
    "Essence Cave": {
      "Chamber 1": null,
      "Chamber 2": null,
      "Chamber 3": null,
      "Graveyard": null
    },

    "Treasure Trove of Gems": {
      "Chamber 1": null,
      "Chamber 2": null,
      "Chamber 3": null,
      "Graveyard": null
    },

    "Grand Canyon": {
      "Chamber 1": null,
      "Chamber 2": null,
      "Chamber 3": null,
      "Graveyard": null
    },

    "Sweet Valley": {
      "Chamber 1": null,
      "Chamber 2": null,
      "Chamber 3": null,
      "Graveyard": null
    },

    "Treasures in Ice": {
      "Chamber 1": {
        title: "Treasures in Ice - Chamber 1",
        type: "standard",
        isGraveyard: false,
        grid: [
          [8, 9, 11, 9, 12, 8, 9],
          [10, "block", 8, "block", 7, 11, 7],
          [8, 7, 9, 6, 9, 6, "block"],
          ["block", 8, 6, 8, "bubble", "shaft", ""],
          ["block", 6, 7, 6, 5, "", ""],
          ["block", 5, 4, 5, "block", "", ""],
          ["block", 4, 5, 4, 5, 4, 6],
          ["shaft", "", 4, 5, 4, "block", 5],
          ["", "", 3, 4, 3, 5, 4],
          ["", "", 2, "", 2, 4, 3],
          [1, 2, "", "", "", 3, ""]
        ]
      },
      "Chamber 2": null,
      "Chamber 3": null,
      "Graveyard": null
    },

    "Moon Odyssey": {
      "Chamber 1": null,
      "Chamber 2": null,
      "Chamber 3": null,
      "Graveyard": null
    },

    "Volcano Awakening": {
      "Chamber 1": null,
      "Chamber 2": null,
      "Chamber 3": null,
      "Graveyard": null
    },

    "Excavations in the Sand": {
      "Chamber 1": null,
      "Chamber 2": null,
      "Chamber 3": null,
      "Graveyard": null
    }
  },

  Legacy: {
    "Love Story": buildLegacyStructure(),
    "Clover Festival": buildLegacyStructure(),
    "Easter Egg Hunt": buildLegacyStructure(),
    "4th of July": buildLegacyStructure(),
    "Mystery Reef": buildLegacyStructure(),
    "Teamwork Festival": buildLegacyStructure(),
    "Halloween": buildLegacyStructure(),
    "Fall Festival": buildLegacyStructure(),
    "Winter Break": buildLegacyStructure()
  }
};

function buildLegacyStructure() {
  return {
    "Mine 1": {
      "Chamber 1": null,
      "Chamber 2": null
    },

    "Mine 2": {
      "Chamber 1": null,
      "Chamber 2": null,
      "Chamber 3": null
    },

    "Mine 3": {
      "Chamber 1": null,
      "Chamber 2": null,
      "Chamber 3": null,
      "Chamber 4": null
    },

    "Mine 4": {
      "Chamber 1": null,
      "Chamber 2": null,
      "Chamber 3": null,
      "Chamber 4": null
    },

    "Mine 5": {
      "Chamber 1": null,
      "Chamber 2": null,
      "Chamber 3": null,
      "Chamber 4": null,
      "Graveyard": null
    },

    "Deep Mine": {
      "Chamber 1": null,
      "Chamber 2": null,
      "Chamber 3": null,
      "Chamber 4": null,
      "Graveyard": null
    }
  };
}
