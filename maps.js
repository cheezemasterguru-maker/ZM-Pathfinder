window.ZM_MAP_LIBRARY = {
  Main: {
    "Essence Cave": ["Chamber 1", "Chamber 2", "Chamber 3", "Graveyard"],
    "Treasure Trove of Gems": ["Chamber 1", "Chamber 2", "Chamber 3", "Graveyard"],
    "Grand Canyon": ["Chamber 1", "Chamber 2", "Chamber 3", "Graveyard"],
    "Sweet Valley": ["Chamber 1", "Chamber 2", "Chamber 3", "Graveyard"],
    "Treasures in Ice": ["Chamber 1", "Chamber 2", "Chamber 3", "Graveyard"],
    "Moon Odyssey": ["Chamber 1", "Chamber 2", "Chamber 3", "Graveyard"],
    "Volcano Awakening": ["Chamber 1", "Chamber 2", "Chamber 3", "Graveyard"],
    "Excavations in the Sand": ["Chamber 1", "Chamber 2", "Chamber 3", "Graveyard"]
  },

  Legacy: {
    "Love Story": {
      "Mine 1": ["Chamber 1", "Chamber 2"],
      "Mine 2": ["Chamber 1", "Chamber 2", "Chamber 3"],
      "Mine 3": ["Chamber 1", "Chamber 2", "Chamber 3", "Chamber 4"],
      "Mine 4": ["Chamber 1", "Chamber 2", "Chamber 3", "Chamber 4"],
      "Mine 5": ["Chamber 1", "Chamber 2", "Chamber 3", "Chamber 4", "Graveyard"],
      "Deep Mine": ["Chamber 1", "Chamber 2", "Chamber 3", "Chamber 4", "Graveyard"]
    },
    "Clover Festival": {
      "Mine 1": ["Chamber 1", "Chamber 2"],
      "Mine 2": ["Chamber 1", "Chamber 2", "Chamber 3"],
      "Mine 3": ["Chamber 1", "Chamber 2", "Chamber 3", "Chamber 4"],
      "Mine 4": ["Chamber 1", "Chamber 2", "Chamber 3", "Chamber 4"],
      "Mine 5": ["Chamber 1", "Chamber 2", "Chamber 3", "Chamber 4", "Graveyard"],
      "Deep Mine": ["Chamber 1", "Chamber 2", "Chamber 3", "Chamber 4", "Graveyard"]
    },
    "Easter Egg Hunt": {
      "Mine 1": ["Chamber 1", "Chamber 2"],
      "Mine 2": ["Chamber 1", "Chamber 2", "Chamber 3"],
      "Mine 3": ["Chamber 1", "Chamber 2", "Chamber 3", "Chamber 4"],
      "Mine 4": ["Chamber 1", "Chamber 2", "Chamber 3", "Chamber 4"],
      "Mine 5": ["Chamber 1", "Chamber 2", "Chamber 3", "Chamber 4", "Graveyard"],
      "Deep Mine": ["Chamber 1", "Chamber 2", "Chamber 3", "Chamber 4", "Graveyard"]
    },
    "4th of July": {
      "Mine 1": ["Chamber 1", "Chamber 2"],
      "Mine 2": ["Chamber 1", "Chamber 2", "Chamber 3"],
      "Mine 3": ["Chamber 1", "Chamber 2", "Chamber 3", "Chamber 4"],
      "Mine 4": ["Chamber 1", "Chamber 2", "Chamber 3", "Chamber 4"],
      "Mine 5": ["Chamber 1", "Chamber 2", "Chamber 3", "Chamber 4", "Graveyard"],
      "Deep Mine": ["Chamber 1", "Chamber 2", "Chamber 3", "Chamber 4", "Graveyard"]
    },
    "Mystery Reef": {
      "Mine 1": ["Chamber 1", "Chamber 2"],
      "Mine 2": ["Chamber 1", "Chamber 2", "Chamber 3"],
      "Mine 3": ["Chamber 1", "Chamber 2", "Chamber 3", "Chamber 4"],
      "Mine 4": ["Chamber 1", "Chamber 2", "Chamber 3", "Chamber 4"],
      "Mine 5": ["Chamber 1", "Chamber 2", "Chamber 3", "Chamber 4", "Graveyard"],
      "Deep Mine": ["Chamber 1", "Chamber 2", "Chamber 3", "Chamber 4", "Graveyard"]
    },
    "Teamwork Festival": {
      "Mine 1": ["Chamber 1", "Chamber 2"],
      "Mine 2": ["Chamber 1", "Chamber 2", "Chamber 3"],
      "Mine 3": ["Chamber 1", "Chamber 2", "Chamber 3", "Chamber 4"],
      "Mine 4": ["Chamber 1", "Chamber 2", "Chamber 3", "Chamber 4"],
      "Mine 5": ["Chamber 1", "Chamber 2", "Chamber 3", "Chamber 4", "Graveyard"],
      "Deep Mine": ["Chamber 1", "Chamber 2", "Chamber 3", "Chamber 4", "Graveyard"]
    },
    "Halloween": {
      "Mine 1": ["Chamber 1", "Chamber 2"],
      "Mine 2": ["Chamber 1", "Chamber 2", "Chamber 3"],
      "Mine 3": ["Chamber 1", "Chamber 2", "Chamber 3", "Chamber 4"],
      "Mine 4": ["Chamber 1", "Chamber 2", "Chamber 3", "Chamber 4"],
      "Mine 5": ["Chamber 1", "Chamber 2", "Chamber 3", "Chamber 4", "Graveyard"],
      "Deep Mine": ["Chamber 1", "Chamber 2", "Chamber 3", "Chamber 4", "Graveyard"]
    },
    "Fall Festival": {
      "Mine 1": ["Chamber 1", "Chamber 2"],
      "Mine 2": ["Chamber 1", "Chamber 2", "Chamber 3"],
      "Mine 3": ["Chamber 1", "Chamber 2", "Chamber 3", "Chamber 4"],
      "Mine 4": ["Chamber 1", "Chamber 2", "Chamber 3", "Chamber 4"],
      "Mine 5": ["Chamber 1", "Chamber 2", "Chamber 3", "Chamber 4", "Graveyard"],
      "Deep Mine": ["Chamber 1", "Chamber 2", "Chamber 3", "Chamber 4", "Graveyard"]
    },
    "Winter Break": {
      "Mine 1": ["Chamber 1", "Chamber 2"],
      "Mine 2": ["Chamber 1", "Chamber 2", "Chamber 3"],
      "Mine 3": ["Chamber 1", "Chamber 2", "Chamber 3", "Chamber 4"],
      "Mine 4": ["Chamber 1", "Chamber 2", "Chamber 3", "Chamber 4"],
      "Mine 5": ["Chamber 1", "Chamber 2", "Chamber 3", "Chamber 4", "Graveyard"],
      "Deep Mine": ["Chamber 1", "Chamber 2", "Chamber 3", "Chamber 4", "Graveyard"]
    }
  }
};

// Put your real map boards here.
// Structure:
// Main -> Event Name -> Event Chamber -> map record
// Legacy -> Event Name -> Event Mine -> Event Chamber -> map record
window.ZM_MAP_DATA = {
  Main: {
    "Essence Cave": {
      "Chamber 1": {
        title: "Essence Cave - Chamber 1",
        gateType: "standard",
        grid: [
          [8,9,11,9,12,8,9],
          [10,"X",8,"X",7,11,7],
          [8,7,9,6,9,6,"X"],
          ["X",8,6,8,"B","S","S"],
          ["X",6,7,6,5,"S","S"],
          ["X",5,4,5,"X","S","S"],
          ["X",4,5,4,5,4,6],
          ["S","S",4,5,4,"X",5],
          ["S","S",3,4,3,5,4],
          ["S","S",2,"",2,4,3],
          [1,2,"","","",3,""]
        ]
      }
    }
  },
  Legacy: {}
};
