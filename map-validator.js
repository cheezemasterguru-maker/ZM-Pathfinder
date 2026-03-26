window.ZMMapValidator = {

  validateMainMapData(data) {
    const errors = [];

    if (!data || !data.Main) {
      errors.push("ZM_MAP_DATA.Main is missing.");
      return errors;
    }

    const main = data.Main;

    Object.keys(main).forEach(eventName => {
      const event = main[eventName];

      if (!event) return;

      Object.keys(event).forEach(chamberName => {
        const chamber = event[chamberName];

        if (!chamber) return;

        if (!Array.isArray(chamber.grid)) {
          errors.push(`${eventName} - ${chamberName}: Missing grid.`);
          return;
        }

        chamber.grid.forEach((row, r) => {
          if (!Array.isArray(row)) {
            errors.push(`${eventName} - ${chamberName}: Row ${r} invalid.`);
            return;
          }

          if (row.length !== 7) {
            errors.push(`${eventName} - ${chamberName}: Row ${r} not 7 columns.`);
          }
        });
      });
    });

    return errors;
  },

  validateSingleLoadedGrid(grid, title = "Grid") {
    const errors = [];

    if (!Array.isArray(grid)) {
      return { ok: false, errors: [`${title}: Grid is not an array.`] };
    }

    grid.forEach((row, r) => {
      if (!Array.isArray(row)) {
        errors.push(`${title}: Row ${r} is invalid.`);
        return;
      }

      if (row.length !== 7) {
        errors.push(`${title}: Row ${r} must have 7 columns.`);
      }
    });

    return {
      ok: errors.length === 0,
      errors
    };
  }

};
