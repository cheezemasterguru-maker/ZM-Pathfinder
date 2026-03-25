window.ZM_HELP = {
  shortHelp: `
    Build the board from <b>top to bottom</b> so the grid matches the mine section correctly.
    <br><br>
    Use <b>Title</b> to name the section, and <b>Gate type</b> to choose the correct gate layout before solving.
    <br><br>
    Tap a cell and type a number with the <b>Number</b> tool, or tap a start cell and use <b>Paste From Clipboard</b> for data copied from Sheets or Excel.
    <br><br>
    <b>Block</b>, <b>Bubble</b>, and <b>Shaft</b> place special tiles. Tap the same tile again with the same tool to remove it.
    <br><br>
    Use <b>Solver Help</b> for full instructions on setup, tools, and output.
  `,

  modalHelp: `
    <div class="help-section">
      <h3>What this tool does</h3>
      <p>
        ZM Pathfinder helps Zombie Miner players build an input board that matches a mine section, then calculates efficient pathing for the strongest zombie and the second strongest zombie.
      </p>
      <p>
        The result gives you a visual route preview so you can review likely movement, bubble usage, and shaft access before making decisions in-game.
      </p>
    </div>

    <div class="help-section">
      <h3>Before you enter the grid</h3>
      <p><b>Title:</b> Use this to name the section you are solving, such as Gate 1, Gate 2, or Graveyard.</p>
      <p><b>Gate type:</b> Choose the gate layout that matches the board you are solving before you press Solve.</p>
      <p><b>Standard</b> uses 5 attack points.</p>
      <p><b>End</b> uses 3 attack points.</p>
    </div>

    <div class="help-section">
      <h3>How to build the input grid</h3>
      <p>Always build the board from <b>top to bottom</b> so the layout matches the mine correctly.</p>
      <p>Enter the highest visible row first, then continue downward row by row.</p>
      <p>Use <b>Number</b> to tap a cell and type a mineral value manually.</p>
      <p>Use <b>Paste From Clipboard</b> after selecting the starting cell where the pasted range should begin.</p>
      <p>Paste copied values from Google Sheets or Excel into the correct starting position. Blank pasted cells do not erase existing content.</p>
    </div>

    <div class="help-section">
      <h3>How the tools work</h3>
      <p><b>Number:</b> Tap a cell and type the mineral value for that position.</p>
      <p><b>Block:</b> Places a blocked tile. Tap the same blocked tile again with the Block tool to remove it.</p>
      <p><b>Bubble:</b> Places a bubble tile. Tap the same bubble again with the Bubble tool to remove it.</p>
      <p><b>Shaft:</b> Places a 2×3 shaft using the tapped cell as the top-left start point. Tap a shaft tile again with the Shaft tool to remove that shaft.</p>
      <p><b>Clear Board:</b> Resets the entire grid.</p>
      <p><b>Sample Grid:</b> Loads a premade example so you can see how the solver behaves.</p>
    </div>

    <div class="help-section">
      <h3>What the solver shows</h3>
      <p><b>Red path:</b> the strongest zombie’s route.</p>
      <p><b>Blue path:</b> the second strongest zombie’s route.</p>
      <p>The preview shows mineral values, bubbles, shafts, and the calculated routes. The report summarizes the selected solution and current solver version.</p>
    </div>
  `
};
