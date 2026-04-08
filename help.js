window.ZM_HELP_TRANSLATED = {
  en: {
    shortHelp: `
      Enter numbers, blocks, bubbles, and shafts into the board, or load a saved map. Then press Solve to generate the best route.
    `,
    modalHelp: `
      <div class="help-section">
        <h3 style="text-align:center;">How to use ZM Pathfinder</h3>
        <p style="text-align:left;">
          ZM Pathfinder lets you build a board, load saved maps, and solve for the best route to the gate.
        </p>
        <p style="text-align:left;">
          You can either enter a board manually with the tools or load a saved map from the Map Loader.
        </p>
        <p style="text-align:left;">
          Once the board is ready, press <b>Solve</b> to generate the route and view the result in the Preview.
        </p>
      </div>

      <div class="help-section">
        <h3 style="text-align:center;">Board tools</h3>
        <p style="text-align:left;"><b>Number</b> = mineral level tile. Tap a tile and enter its value.</p>
        <p style="text-align:left;"><b>Block</b> = blocked tile. The route cannot cross it.</p>
        <p style="text-align:left;"><b>Bubble</b> = required bubble target. All bubbles must be collected.</p>
        <p style="text-align:left;"><b>Shaft</b> = shaft tiles. Shafts cannot be crossed and must be touched from an adjacent tile to open.</p>
      </div>

      <div class="help-section">
        <h3 style="text-align:center;">Route colors</h3>
        <p style="text-align:left;"><b>Red</b> = 1st Strongest Z. Main gate-breaking route.</p>
        <p style="text-align:left;"><b>Blue</b> = 2nd Strongest Z. Opens shafts and may take some bubble work if that is cheaper.</p>
      </div>

      <div class="help-section">
        <h3 style="text-align:center;">Gate types</h3>
        <p style="text-align:left;"><b>Standard gate</b> = 5 attack points.</p>
        <p style="text-align:left;"><b>End gate</b> = 3 attack points.</p>
        <p style="text-align:left;">
          Make sure the correct gate type is selected before solving, or the result will be wrong.
        </p>
      </div>

      <div class="help-section">
        <h3 style="text-align:center;">Movement rules</h3>
        <p style="text-align:left;">Movement only goes up, down, left, and right.</p>
        <p style="text-align:left;">Diagonal movement is not allowed.</p>
        <p style="text-align:left;">Blocked tiles and shaft tiles cannot be walked through.</p>
      </div>

      <div class="help-section">
        <h3 style="text-align:center;">Map Loader</h3>
        <p style="text-align:left;">
          Use the loader to choose <b>Main DEEP</b>, <b>Main Events</b>, or <b>Legacy Events</b>, then select the map you want.
        </p>
        <p style="text-align:left;">
          After choosing the event, mine if needed, and chamber, press <b>Load Map</b>.
        </p>
      </div>

      <div class="help-section">
        <h3 style="text-align:center;">Buttons</h3>
        <p style="text-align:left;"><b>Clear Board</b> clears the current board.</p>
        <p style="text-align:left;"><b>Solve</b> runs the solver.</p>
        <p style="text-align:left;"><b>Download PNG</b> exports the preview image.</p>
        <p style="text-align:left;"><b>Sample Grid</b> loads a sample board.</p>
        <p style="text-align:left;"><b>Paste From Clipboard</b> pastes copied grid data starting from the selected tile.</p>
        <p style="text-align:left;"><b>Route Report</b> shows route analysis and shaft data.</p>
        <p style="text-align:left;"><b>Object Priorities</b> opens the custom priority settings.</p>
      </div>

      <div class="help-section">
        <h3 style="text-align:center;">Steel Showdown</h3>
        <p style="text-align:left;">
          Steel Showdown calculates total gears for the current board using the map objects and selected multiplier.
        </p>
        <p style="text-align:left;">Each normal object counts as <b>1</b>.</p>
        <p style="text-align:left;">Each <b>bubble</b> counts as <b>5</b>.</p>
        <p style="text-align:left;">Each full <b>shaft</b> counts as <b>3</b>.</p>
        <p style="text-align:left;"><b>Standard gate</b> counts as <b>5</b>.</p>
        <p style="text-align:left;"><b>End gate</b> counts as <b>10</b>.</p>
        <p style="text-align:left;">
          Choose a multiplier, then press <b>Calculate</b> to get the final total.
        </p>
      </div>

      <div class="help-section">
        <h3 style="text-align:center;">Tips</h3>
        <p style="text-align:left;">If tiles have already been destroyed, remove or edit them before solving again.</p>
        <p style="text-align:left;">Always confirm the board and route in the Preview after solving.</p>
        <p style="text-align:left;">If a loaded map looks wrong, check the gate type and chamber selection first.</p>
      </div>
    `
  },

  ru: {
    shortHelp: `
      Введите числа, блоки, пузыри и шахты на поле или загрузите сохранённую карту. Затем нажмите «Решить», чтобы построить лучший маршрут.
    `,
    modalHelp: `
      <div class="help-section">
        <h3 style="text-align:center;">Как использовать ZM Pathfinder</h3>
        <p style="text-align:left;">
          ZM Pathfinder позволяет строить поле, загружать сохранённые карты и находить лучший маршрут к воротам.
        </p>
        <p style="text-align:left;">
          Вы можете вручную заполнить поле с помощью инструментов или загрузить карту через загрузчик.
        </p>
        <p style="text-align:left;">
          Когда поле готово, нажмите <b>Решить</b>, чтобы построить маршрут и увидеть результат в предпросмотре.
        </p>
      </div>

      <div class="help-section">
        <h3 style="text-align:center;">Инструменты поля</h3>
        <p style="text-align:left;"><b>Число</b> = плитка уровня минерала. Нажмите на клетку и введите значение.</p>
        <p style="text-align:left;"><b>Блок</b> = заблокированная плитка. Маршрут не может пройти через неё.</p>
        <p style="text-align:left;"><b>Пузырь</b> = обязательная цель-пузырь. Все пузыри должны быть собраны.</p>
        <p style="text-align:left;"><b>Шахта</b> = плитки шахты. Через шахты нельзя проходить, их нужно коснуться с соседней клетки, чтобы открыть.</p>
      </div>

      <div class="help-section">
        <h3 style="text-align:center;">Цвета маршрутов</h3>
        <p style="text-align:left;"><b>Красный</b> = 1-й сильнейший Z. Основной маршрут для разрушения ворот.</p>
        <p style="text-align:left;"><b>Синий</b> = 2-й сильнейший Z. Открывает шахты и может брать часть пузырей, если это дешевле.</p>
      </div>

      <div class="help-section">
        <h3 style="text-align:center;">Типы ворот</h3>
        <p style="text-align:left;"><b>Обычные ворота</b> = 5 точек атаки.</p>
        <p style="text-align:left;"><b>Финальные ворота</b> = 3 точки атаки.</p>
        <p style="text-align:left;">
          Перед решением обязательно выберите правильный тип ворот, иначе результат будет неверным.
        </p>
      </div>

      <div class="help-section">
        <h3 style="text-align:center;">Правила движения</h3>
        <p style="text-align:left;">Движение возможно только вверх, вниз, влево и вправо.</p>
        <p style="text-align:left;">Диагональное движение запрещено.</p>
        <p style="text-align:left;">Через блоки и шахты проходить нельзя.</p>
      </div>

      <div class="help-section">
        <h3 style="text-align:center;">Загрузка карты</h3>
        <p style="text-align:left;">
          Используйте загрузчик, чтобы выбрать <b>Main DEEP</b>, <b>Main Events</b> или <b>Legacy Events</b>, а затем нужную карту.
        </p>
        <p style="text-align:left;">
          После выбора события, шахты при необходимости и камеры нажмите <b>Load Map</b>.
        </p>
      </div>

      <div class="help-section">
        <h3 style="text-align:center;">Кнопки</h3>
        <p style="text-align:left;"><b>Clear Board</b> очищает текущее поле.</p>
        <p style="text-align:left;"><b>Solve</b> запускает решатель.</p>
        <p style="text-align:left;"><b>Download PNG</b> экспортирует изображение предпросмотра.</p>
        <p style="text-align:left;"><b>Sample Grid</b> загружает пример поля.</p>
        <p style="text-align:left;"><b>Paste From Clipboard</b> вставляет данные сетки начиная с выбранной клетки.</p>
        <p style="text-align:left;"><b>Route Report</b> показывает анализ маршрута и данные по шахтам.</p>
        <p style="text-align:left;"><b>Object Priorities</b> открывает настройки пользовательских приоритетов.</p>
      </div>

      <div class="help-section">
        <h3 style="text-align:center;">Steel Showdown</h3>
        <p style="text-align:left;">
          Steel Showdown считает общее количество шестерёнок для текущего поля на основе объектов карты и выбранного множителя.
        </p>
        <p style="text-align:left;">Каждый обычный объект считается за <b>1</b>.</p>
        <p style="text-align:left;">Каждый <b>пузырь</b> считается за <b>5</b>.</p>
        <p style="text-align:left;">Каждая полная <b>шахта</b> считается за <b>3</b>.</p>
        <p style="text-align:left;"><b>Обычные ворота</b> считаются за <b>5</b>.</p>
        <p style="text-align:left;"><b>Финальные ворота</b> считаются за <b>10</b>.</p>
        <p style="text-align:left;">
          Выберите множитель, затем нажмите <b>Calculate</b>, чтобы получить итог.
        </p>
      </div>

      <div class="help-section">
        <h3 style="text-align:center;">Советы</h3>
        <p style="text-align:left;">Если какие-то плитки уже разрушены, удалите или измените их перед повторным расчётом.</p>
        <p style="text-align:left;">После решения всегда проверяйте поле и маршрут в предпросмотре.</p>
        <p style="text-align:left;">Если загруженная карта выглядит неправильно, сначала проверьте тип ворот и выбранную камеру.</p>
      </div>
    `
  },

  de: {
    shortHelp: `
      Gib Zahlen, Blöcke, Blasen und Schächte ins Feld ein oder lade eine gespeicherte Karte. Drücke dann auf „Lösen“, um die beste Route zu berechnen.
    `,
    modalHelp: `
      <div class="help-section">
        <h3 style="text-align:center;">So verwendest du ZM Pathfinder</h3>
        <p style="text-align:left;">
          Mit ZM Pathfinder kannst du ein Feld aufbauen, gespeicherte Karten laden und die beste Route zum Tor berechnen.
        </p>
        <p style="text-align:left;">
          Du kannst das Feld manuell mit den Werkzeugen eingeben oder eine Karte über den Kartenlader laden.
        </p>
        <p style="text-align:left;">
          Wenn das Feld fertig ist, drücke <b>Lösen</b>, um die Route zu erzeugen und das Ergebnis in der Vorschau zu sehen.
        </p>
      </div>

      <div class="help-section">
        <h3 style="text-align:center;">Feld-Werkzeuge</h3>
        <p style="text-align:left;"><b>Zahl</b> = Mineralstufen-Feld. Tippe ein Feld an und gib den Wert ein.</p>
        <p style="text-align:left;"><b>Block</b> = blockiertes Feld. Die Route kann es nicht durchqueren.</p>
        <p style="text-align:left;"><b>Blase</b> = erforderliches Blasen-Ziel. Alle Blasen müssen eingesammelt werden.</p>
        <p style="text-align:left;"><b>Schacht</b> = Schachtfelder. Schächte können nicht durchquert werden und müssen von einem angrenzenden Feld berührt werden, um geöffnet zu werden.</p>
      </div>

      <div class="help-section">
        <h3 style="text-align:center;">Routenfarben</h3>
        <p style="text-align:left;"><b>Rot</b> = 1. stärkster Z. Haupt-Route zum Tor.</p>
        <p style="text-align:left;"><b>Blau</b> = 2. stärkster Z. Öffnet Schächte und kann einige Blasen übernehmen, wenn das günstiger ist.</p>
      </div>

      <div class="help-section">
        <h3 style="text-align:center;">Tor-Typen</h3>
        <p style="text-align:left;"><b>Standardtor</b> = 5 Angriffspunkte.</p>
        <p style="text-align:left;"><b>Endtor</b> = 3 Angriffspunkte.</p>
        <p style="text-align:left;">
          Achte vor dem Lösen darauf, den richtigen Tortyp auszuwählen, sonst ist das Ergebnis falsch.
        </p>
      </div>

      <div class="help-section">
        <h3 style="text-align:center;">Bewegungsregeln</h3>
        <p style="text-align:left;">Bewegung ist nur nach oben, unten, links und rechts erlaubt.</p>
        <p style="text-align:left;">Diagonale Bewegung ist nicht erlaubt.</p>
        <p style="text-align:left;">Blockierte Felder und Schachtfelder können nicht betreten werden.</p>
      </div>

      <div class="help-section">
        <h3 style="text-align:center;">Kartenlader</h3>
        <p style="text-align:left;">
          Nutze den Lader, um <b>Main DEEP</b>, <b>Main Events</b> oder <b>Legacy Events</b> auszuwählen und dann die gewünschte Karte zu laden.
        </p>
        <p style="text-align:left;">
          Wähle Event, Mine falls nötig und Kammer aus und drücke dann <b>Load Map</b>.
        </p>
      </div>

      <div class="help-section">
        <h3 style="text-align:center;">Schaltflächen</h3>
        <p style="text-align:left;"><b>Clear Board</b> leert das aktuelle Feld.</p>
        <p style="text-align:left;"><b>Solve</b> startet den Solver.</p>
        <p style="text-align:left;"><b>Download PNG</b> exportiert die Vorschau als Bild.</p>
        <p style="text-align:left;"><b>Sample Grid</b> lädt ein Beispiel-Feld.</p>
        <p style="text-align:left;"><b>Paste From Clipboard</b> fügt kopierte Grid-Daten ab dem ausgewählten Feld ein.</p>
        <p style="text-align:left;"><b>Route Report</b> zeigt Routenanalyse und Schachtdaten an.</p>
        <p style="text-align:left;"><b>Object Priorities</b> öffnet die benutzerdefinierten Prioritäten.</p>
      </div>

      <div class="help-section">
        <h3 style="text-align:center;">Steel Showdown</h3>
        <p style="text-align:left;">
          Steel Showdown berechnet die Gesamtzahl der Zahnräder für das aktuelle Feld anhand der Kartenobjekte und des gewählten Multiplikators.
        </p>
        <p style="text-align:left;">Jedes normale Objekt zählt <b>1</b>.</p>
        <p style="text-align:left;">Jede <b>Blase</b> zählt <b>5</b>.</p>
        <p style="text-align:left;">Jeder vollständige <b>Schacht</b> zählt <b>3</b>.</p>
        <p style="text-align:left;"><b>Standardtor</b> zählt <b>5</b>.</p>
        <p style="text-align:left;"><b>Endtor</b> zählt <b>10</b>.</p>
        <p style="text-align:left;">
          Wähle einen Multiplikator und drücke dann <b>Calculate</b>, um die Endsumme zu erhalten.
        </p>
      </div>

      <div class="help-section">
        <h3 style="text-align:center;">Tipps</h3>
        <p style="text-align:left;">Wenn Felder bereits zerstört wurden, entferne oder ändere sie vor einer neuen Berechnung.</p>
        <p style="text-align:left;">Prüfe Feld und Route nach dem Lösen immer in der Vorschau.</p>
        <p style="text-align:left;">Wenn eine geladene Karte falsch aussieht, überprüfe zuerst Tortyp und Kammerauswahl.</p>
      </div>
    `
  },

  es: {
    shortHelp: `
      Ingresa números, bloques, burbujas y pozos en el tablero o carga un mapa guardado. Luego pulsa Resolver para generar la mejor ruta.
    `,
    modalHelp: `
      <div class="help-section">
        <h3 style="text-align:center;">Cómo usar ZM Pathfinder</h3>
        <p style="text-align:left;">
          ZM Pathfinder te permite construir un tablero, cargar mapas guardados y resolver la mejor ruta hacia la puerta.
        </p>
        <p style="text-align:left;">
          Puedes ingresar el tablero manualmente con las herramientas o cargar un mapa desde el cargador.
        </p>
        <p style="text-align:left;">
          Cuando el tablero esté listo, pulsa <b>Resolver</b> para generar la ruta y ver el resultado en la Vista previa.
        </p>
      </div>

      <div class="help-section">
        <h3 style="text-align:center;">Herramientas del tablero</h3>
        <p style="text-align:left;"><b>Número</b> = casilla de nivel mineral. Toca una casilla e ingresa su valor.</p>
        <p style="text-align:left;"><b>Bloque</b> = casilla bloqueada. La ruta no puede cruzarla.</p>
        <p style="text-align:left;"><b>Burbuja</b> = objetivo obligatorio. Todas las burbujas deben ser recogidas.</p>
        <p style="text-align:left;"><b>Pozo</b> = casillas de pozo. No se pueden cruzar y deben tocarse desde una casilla adyacente para abrirse.</p>
      </div>

      <div class="help-section">
        <h3 style="text-align:center;">Colores de ruta</h3>
        <p style="text-align:left;"><b>Rojo</b> = 1er Z más fuerte. Ruta principal para romper la puerta.</p>
        <p style="text-align:left;"><b>Azul</b> = 2do Z más fuerte. Abre pozos y puede encargarse de algunas burbujas si es más barato.</p>
      </div>

      <div class="help-section">
        <h3 style="text-align:center;">Tipos de puerta</h3>
        <p style="text-align:left;"><b>Puerta estándar</b> = 5 puntos de ataque.</p>
        <p style="text-align:left;"><b>Puerta final</b> = 3 puntos de ataque.</p>
        <p style="text-align:left;">
          Asegúrate de elegir el tipo correcto antes de resolver o el resultado será incorrecto.
        </p>
      </div>

      <div class="help-section">
        <h3 style="text-align:center;">Reglas de movimiento</h3>
        <p style="text-align:left;">El movimiento solo va hacia arriba, abajo, izquierda y derecha.</p>
        <p style="text-align:left;">No se permite movimiento diagonal.</p>
        <p style="text-align:left;">No se puede caminar por bloques ni por pozos.</p>
      </div>

      <div class="help-section">
        <h3 style="text-align:center;">Cargador de mapas</h3>
        <p style="text-align:left;">
          Usa el cargador para elegir <b>Main DEEP</b>, <b>Main Events</b> o <b>Legacy Events</b> y luego carga el mapa que quieras.
        </p>
        <p style="text-align:left;">
          Después de elegir el evento, mina si hace falta y cámara, pulsa <b>Load Map</b>.
        </p>
      </div>

      <div class="help-section">
        <h3 style="text-align:center;">Botones</h3>
        <p style="text-align:left;"><b>Clear Board</b> limpia el tablero actual.</p>
        <p style="text-align:left;"><b>Solve</b> ejecuta el solver.</p>
        <p style="text-align:left;"><b>Download PNG</b> exporta la vista previa como imagen.</p>
        <p style="text-align:left;"><b>Sample Grid</b> carga un tablero de ejemplo.</p>
        <p style="text-align:left;"><b>Paste From Clipboard</b> pega datos copiados comenzando desde la casilla seleccionada.</p>
        <p style="text-align:left;"><b>Route Report</b> muestra el análisis de rutas y datos de pozos.</p>
        <p style="text-align:left;"><b>Object Priorities</b> abre la configuración de prioridades personalizadas.</p>
      </div>

      <div class="help-section">
        <h3 style="text-align:center;">Steel Showdown</h3>
        <p style="text-align:left;">
          Steel Showdown calcula el total de engranajes del tablero actual usando los objetos del mapa y el multiplicador elegido.
        </p>
        <p style="text-align:left;">Cada objeto normal cuenta como <b>1</b>.</p>
        <p style="text-align:left;">Cada <b>burbuja</b> cuenta como <b>5</b>.</p>
        <p style="text-align:left;">Cada <b>pozo</b> completo cuenta como <b>3</b>.</p>
        <p style="text-align:left;"><b>Puerta estándar</b> cuenta como <b>5</b>.</p>
        <p style="text-align:left;"><b>Puerta final</b> cuenta como <b>10</b>.</p>
        <p style="text-align:left;">
          Elige un multiplicador y luego pulsa <b>Calculate</b> para obtener el total final.
        </p>
      </div>

      <div class="help-section">
        <h3 style="text-align:center;">Consejos</h3>
        <p style="text-align:left;">Si algunas casillas ya fueron destruidas, elimínalas o edítalas antes de volver a resolver.</p>
        <p style="text-align:left;">Después de resolver, revisa siempre el tablero y la ruta en la Vista previa.</p>
        <p style="text-align:left;">Si un mapa cargado se ve mal, primero revisa el tipo de puerta y la cámara elegida.</p>
      </div>
    `
  }
};

window.ZM_HELP = window.ZM_HELP_TRANSLATED.en;
