window.ZM_OBJECT_TYPES = {
  // --- NO SUBTYPE OBJECTS ---
  gems: {
    label: "Gems",
    color: "#ff6b6b" // Light Red
  },
  badges: {
    label: "Badges",
    color: "#c084fc" // Light Purple
  },
  emblems: {
    label: "Emblems",
    color: "#facc15" // Gold
  },
  keys: {
    label: "Keys",
    color: "#fde047" // Yellow
  },
  essence: {
    label: "Essence",
    color: "#86efac" // Light Green
  },
  plain: {
    label: "Plain",
    color: null // no fill
  },

  // --- SUBTYPE OBJECTS ---
  chest: {
    label: "Chests",
    hasSubtype: true,
    subtypes: {
      wood: {
        label: "Wood",
        color: "#d2a679" // Light Brown
      },
      iron: {
        label: "Iron",
        color: "#22c55e" // Green
      },
      steel: {
        label: "Steel",
        color: "#9ca3af" // Silver
      },
      silver: {
        label: "Silver",
        color: "linear-gradient(135deg, #9ca3af 50%, #60a5fa 50%)"
      },
      gold: {
        label: "Gold",
        color: "linear-gradient(135deg, #22c55e 50%, #facc15 50%)"
      }
    }
  }
};
