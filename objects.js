window.ZM_OBJECT_TYPES = {
  plain: {
    label: "Plain",
    code: null,
    fill: null
  },

  gems: {
    label: "Gems",
    code: "GEM",
    fill: "#ff6b6b"
  },

  badges: {
    label: "Badges",
    code: "BDG",
    fill: "#c084fc"
  },

  emblems: {
    label: "Emblems",
    code: "E",
    fill: "#facc15"
  },

  keys: {
    label: "Keys",
    code: "K",
    fill: "#fde047"
  },

  essence: {
    label: "Essence",
    code: "ESS",
    fill: "#86efac"
  },

  chest: {
    label: "Chest",
    hasSubtype: true,
    subtypes: {
      wood: {
        label: "Wood",
        code: "WD",
        fill: "#d2a679"
      },
      iron: {
        label: "Iron",
        code: "IRN",
        fill: "#22c55e"
      },
      steel: {
        label: "Steel",
        code: "STL",
        fill: "#9ca3af"
      },
      silver: {
        label: "Silver",
        code: "SIL",
        fill: {
          type: "dual",
          colors: ["#9ca3af", "#60a5fa"]
        }
      },
      gold: {
        label: "Gold",
        code: "GLD",
        fill: {
          type: "dual",
          colors: ["#22c55e", "#facc15"]
        }
      }
    }
  }
};
