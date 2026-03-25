window.ZM_HELP = {
  shortHelp: `
    Build the board from <b>top to bottom</b> so the grid matches the mine section correctly.
    <br><br>
    Non-graveyard boards use a <b>7×13</b> grid. Graveyard boards use a <b>7×20</b> grid.
    <br><br>
    Use <b>Title</b> to name the section, and <b>Gate type</b> to choose the correct gate layout before solving.
    <br><br>
    Use the <b>Map Loader</b> to quickly load any stored map, then edit it if needed.
    <br><br>
    Tap a cell and type a number with the <b>Number</b> tool, or tap a start cell and use <b>Paste From Clipboard</b> for data copied from Sheets or Excel.
    <br><br>
    <b>Block</b>, <b>Bubble</b>, and <b>Shaft</b> place special tiles. Tap the same tile again with the same tool to remove it.
    <br><br>
    Use <b>Solver Help</b> for full instructions on setup, map loading, tools, and output.
  `,

  modalHelp: `
    <div class="help-section">
      <h3>What this tool does</h3>
      <p>ZM Pathfinder helps Zombie Miner players build or load an input board that matches a mine section, then calculate efficient pathing for the strongest zombie and the second strongest zombie.</p>
      <p>The result gives you a visual route preview so you can review movement, bubble usage, shaft access, and route efficiency before making decisions in-game.</p>
    </div>

    <div class="help-section">
      <h3>Before you enter the grid</h3>
      <p><b>Title:</b> Use this to name the section you are solving. This can be a simple label such as Gate 1, Chamber 3, or Graveyard.</p>
      <p><b>Gate type:</b> Choose the gate layout that matches the board you are solving before you press Solve.</p>
      <p><b>Standard</b> uses 5 attack points.</p>
      <p><b>End</b> uses 3 attack points.</p>
    </div>

    <div class="help-section">
      <h3>Grid size rules</h3>
      <p>Non-graveyard boards use a <b>7×13</b> grid.</p>
      <p>Graveyard boards use a <b>7×20</b> grid.</p>
      <p>The board changes size automatically when you select or load a graveyard map.</p>
    </div>

    <div class="help-section">
      <h3>How to build the input grid</h3>
      <p>Always build the board from <b>top to bottom</b> so the layout matches the mine correctly.</p>
      <p>Enter the highest visible row first, then continue downward row by row.</p>
      <p>You can either build the board manually or load a stored map.</p>
    </div>

    <div class="help-section">
      <h3>Map Loader</h3>
      <p><b>Map Loader</b> is available to all testers.</p>
      <p>Use the dropdowns in order:</p>
      <p><b>Event Type</b> → choose Main or Legacy.</p>
      <p><b>Event Name</b> → choose the event or mine name.</p>
      <p><b>Event Mine</b> → appears only for Legacy events.</p>
      <p><b>Event Chamber</b> → choose the chamber or graveyard.</p>
      <p>The next menu appears only after the previous selection is made.</p>
      <p>Once a valid chamber is selected, the <b>Load Map</b> button appears.</p>
      <p>Press it to load the stored board into the grid.</p>
      <p>The title will update automatically based on your selection.</p>
      <p>You can still edit the grid after loading a map.</p>
    </div>

    <div class="help-section">
      <h3>How manual input works</h3>
      <p><b>Number:</b> Tap a cell and type the mineral value.</p>
      <p><b>Paste From Clipboard:</b> Select the starting cell, then paste copied data from Sheets or Excel.</p>
      <p>Blank pasted cells will not overwrite existing values.</p>
    </div>

    <div class="help-section">
      <h3>How the tools work</h3>
      <p><b>Block:</b> Places a blocked tile. Tap again to remove.</p>
      <p><b>Bubble:</b> Places a bubble tile. Tap again to remove.</p>
      <p><b>Shaft:</b> Places a 2×3 shaft using the tapped cell as the top-left start point. Tap again to remove the shaft.</p>
      <p><b>Clear Board:</b> Resets the board.</p>
      <p><b>Sample Grid:</b> Loads an example board.</p>
      <p><b>Download PNG:</b> Exports the preview image.</p>
    </div>

    <div class="help-section">
      <h3>What the solver shows</h3>
      <p><b>Red path:</b> strongest zombie route.</p>
      <p><b>Blue path:</b> second strongest zombie route.</p>
      <p>The preview displays minerals, bubbles, shafts, and calculated paths.</p>
      <p>The report shows solver results and status.</p>
    </div>

    <div class="help-section">
      <h3>Important notes</h3>
      <p>The more accurate your board is, the better your results will be.</p>
      <p>Double-check row order and special tiles before solving.</p>
      <p>Loaded maps can always be edited after placement.</p>
    </div>
  `
};
