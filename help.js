window.ZM_HELP_TRANSLATED = {
  en: {
    shortHelp: `
      Enter numbers, blocks, bubbles, and shafts into the board or load a saved map. Then solve to generate the red and blue routes.
    `,
    modalHelp: `
      <h3>How to use ZM Pathfinder</h3>
      <p><b>Number</b> = mineral level tile.</p>
      <p><b>Block</b> = blocked tile. Cannot be crossed.</p>
      <p><b>Bubble</b> = a required bubble target.</p>
      <p><b>Shaft</b> = shaft tiles. Shafts are treated as special blocked zones that must be touched from an adjacent tile to open.</p>

      <h3>Route colors</h3>
      <p><b>Red</b> = 1st Strongest Z. Main gate-breaking route.</p>
      <p><b>Blue</b> = 2nd Strongest Z. Opens shafts and may handle some bubble work if cheaper.</p>

      <h3>Gate types</h3>
      <p><b>Standard gate</b> = 5 attack points.</p>
      <p><b>End gate</b> = 3 attack points.</p>

      <h3>Map Loader</h3>
      <p>Use the loader to pick Main DEEP, Main Events, or Legacy Events and then load a chamber.</p>

      <h3>Buttons</h3>
      <p><b>Clear Board</b> clears the current board.</p>
      <p><b>Solve</b> runs the solver.</p>
      <p><b>Download PNG</b> exports the preview image.</p>
      <p><b>Sample Grid</b> loads a sample board.</p>
      <p><b>Paste From Clipboard</b> pastes copied grid data starting from the selected tile.</p>
      <p><b>Route Report</b> shows route analysis and shaft-data resolution.</p>

      <h3>Notes</h3>
      <p>No diagonal movement is allowed.</p>
      <p>Shafts are usually 2 wide by 3 tall.</p>
      <p>Empty cells should stay as blank strings when stored in map data.</p>
    `
  },

  ru: {
    shortHelp: `
      Введите числа, блоки, пузыри и шахты в поле или загрузите сохранённую карту. Затем запустите решение, чтобы построить красный и синий маршруты.
    `,
    modalHelp: `
      <h3>Как использовать ZM Pathfinder</h3>
      <p><b>Число</b> = плитка уровня минерала.</p>
      <p><b>Блок</b> = заблокированная плитка. Через неё нельзя пройти.</p>
      <p><b>Пузырь</b> = обязательная цель-пузырь.</p>
      <p><b>Шахта</b> = плитки шахты. Шахты считаются особыми заблокированными зонами, которые нужно коснуться с соседней клетки, чтобы открыть.</p>

      <h3>Цвета маршрутов</h3>
      <p><b>Красный</b> = 1-й сильнейший Z. Основной маршрут к воротам.</p>
      <p><b>Синий</b> = 2-й сильнейший Z. Открывает шахты и иногда берёт пузырь, если это дешевле.</p>

      <h3>Типы ворот</h3>
      <p><b>Обычные ворота</b> = 5 точек атаки.</p>
      <p><b>Финальные ворота</b> = 3 точки атаки.</p>

      <h3>Загрузка карты</h3>
      <p>Используйте загрузчик для выбора Main DEEP, Main Events или Legacy Events, затем загрузите камеру.</p>

      <h3>Кнопки</h3>
      <p><b>Очистить</b> очищает текущее поле.</p>
      <p><b>Решить</b> запускает решатель.</p>
      <p><b>Скачать PNG</b> экспортирует изображение предпросмотра.</p>
      <p><b>Пример</b> загружает пример поля.</p>
      <p><b>Вставить</b> вставляет скопированные данные сетки с выбранной клетки.</p>
      <p><b>Отчёт</b> показывает анализ маршрута и данные по шахтам.</p>

      <h3>Примечания</h3>
      <p>Диагональное движение запрещено.</p>
      <p>Шахты обычно имеют размер 2 в ширину и 3 в высоту.</p>
      <p>Пустые клетки должны храниться как пустые строки.</p>
    `
  },

  de: {
    shortHelp: `
      Gib Zahlen, Blöcke, Blasen und Schächte in das Feld ein oder lade eine gespeicherte Karte. Danach löst der Solver die roten und blauen Routen.
    `,
    modalHelp: `
      <h3>So verwendest du ZM Pathfinder</h3>
      <p><b>Zahl</b> = Kachel mit Mineralstufe.</p>
      <p><b>Block</b> = blockierte Kachel. Kann nicht betreten werden.</p>
      <p><b>Blase</b> = erforderliches Blasen-Ziel.</p>
      <p><b>Schacht</b> = Schacht-Kacheln. Schächte sind spezielle blockierte Zonen, die von einer angrenzenden Kachel berührt werden müssen, um geöffnet zu werden.</p>

      <h3>Routenfarben</h3>
      <p><b>Rot</b> = 1. stärkster Z. Hauptweg zum Tor.</p>
      <p><b>Blau</b> = 2. stärkster Z. Öffnet Schächte und übernimmt manchmal Blasen, wenn es günstiger ist.</p>

      <h3>Tor-Typen</h3>
      <p><b>Standardtor</b> = 5 Angriffspunkte.</p>
      <p><b>Endtor</b> = 3 Angriffspunkte.</p>

      <h3>Kartenlader</h3>
      <p>Nutze den Lader für Main DEEP, Main Events oder Legacy Events und lade dann eine Kammer.</p>

      <h3>Buttons</h3>
      <p><b>Leeren</b> löscht das aktuelle Feld.</p>
      <p><b>Lösen</b> startet den Solver.</p>
      <p><b>PNG herunterladen</b> exportiert die Vorschau als Bild.</p>
      <p><b>Beispiel</b> lädt ein Beispielraster.</p>
      <p><b>Einfügen</b> fügt kopierte Grid-Daten ab der ausgewählten Kachel ein.</p>
      <p><b>Bericht</b> zeigt Routenanalyse und Schachtdaten an.</p>

      <h3>Hinweise</h3>
      <p>Keine diagonale Bewegung.</p>
      <p>Schächte sind normalerweise 2 Felder breit und 3 Felder hoch.</p>
      <p>Leere Felder sollten als leere Strings gespeichert werden.</p>
    `
  },

  es: {
    shortHelp: `
      Ingresa números, bloques, burbujas y pozos en el tablero o carga un mapa guardado. Luego resuelve para generar las rutas roja y azul.
    `,
    modalHelp: `
      <h3>Cómo usar ZM Pathfinder</h3>
      <p><b>Número</b> = casilla de nivel de mineral.</p>
      <p><b>Bloque</b> = casilla bloqueada. No se puede cruzar.</p>
      <p><b>Burbuja</b> = objetivo de burbuja obligatorio.</p>
      <p><b>Pozo</b> = casillas de pozo. Los pozos se tratan como zonas bloqueadas especiales que deben tocarse desde una casilla adyacente para abrirse.</p>

      <h3>Colores de ruta</h3>
      <p><b>Rojo</b> = 1er Z más fuerte. Ruta principal para romper la puerta.</p>
      <p><b>Azul</b> = 2do Z más fuerte. Abre pozos y puede encargarse de algunas burbujas si sale más barato.</p>

      <h3>Tipos de puerta</h3>
      <p><b>Puerta estándar</b> = 5 puntos de ataque.</p>
      <p><b>Puerta final</b> = 3 puntos de ataque.</p>

      <h3>Cargador de mapas</h3>
      <p>Usa el cargador para elegir Main DEEP, Main Events o Legacy Events y luego carga una cámara.</p>

      <h3>Botones</h3>
      <p><b>Limpiar tablero</b> limpia el tablero actual.</p>
      <p><b>Resolver</b> ejecuta el solver.</p>
      <p><b>Descargar PNG</b> exporta la vista previa.</p>
      <p><b>Cuadrícula de ejemplo</b> carga un tablero de ejemplo.</p>
      <p><b>Pegar desde portapapeles</b> pega datos copiados comenzando desde la casilla seleccionada.</p>
      <p><b>Reporte de ruta</b> muestra el análisis de rutas y la resolución de datos de pozos.</p>

      <h3>Notas</h3>
      <p>No se permite movimiento diagonal.</p>
      <p>Los pozos normalmente son de 2 de ancho por 3 de alto.</p>
      <p>Las celdas vacías deben mantenerse como cadenas vacías.</p>
    `
  }
};

window.ZM_HELP = window.ZM_HELP_TRANSLATED.en;
