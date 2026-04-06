window.ZM_OBJECT_TYPES = {
  plain: {
    label: "Plain",
    code: null,
    fill: null
  },

  gems: {
    label: "Gems",
    code: "Gems",
    fill: "#ff6b6b"
  },

  emblems: {
    label: "Emblems",
    code: "Emb",
    fill: "#c084fc"
  },

  badges: {
    label: "Badges",
    code: "Badge",
    fill: {
      type: "dual",
      colors: ["#ef4444", "#facc15"]
    }
  },

  keys: {
    label: "Keys",
    code: "Key",
    fill: "#fde047"
  },

  essence: {
    label: "Essence",
    code: "ESS",
    fill: "#86efac"
  },

  stickers: {
    label: "Stickers",
    code: "STK",
    fill: "#14b8a6"
  },

  chest: {
    label: "Chest",
    hasSubtype: true,
    subtypes: {
      wood: {
        label: "Wood",
        code: "WOOD",
        fill: "#d2a679"
      },
      iron: {
        label: "Iron",
        code: "IRON",
        fill: "#22c55e"
      },
      steel: {
        label: "Steel",
        code: "STEEL",
        fill: "#9ca3af"
      },
      silver: {
        label: "Silver",
        code: "SILVER",
        fill: {
          type: "dual",
          colors: ["#9ca3af", "#60a5fa"]
        }
      },
      gold: {
        label: "Gold",
        code: "GOLD",
        fill: {
          type: "dual",
          colors: ["#22c55e", "#facc15"]
        }
      }
    }
  }
};
