; Abrir con PugIDE (P-40): el instalador de Windows registra .pug y .jade SOLO en «Abrir con» (OpenWithProgids),
; sin cambiar el programa que la persona ya tenga por defecto. El desinstalador lo quita.
!macro customInstall
  WriteRegStr SHCTX "Software\Classes\PugIDE.Plantilla" "" "Plantilla Pug"
  WriteRegStr SHCTX "Software\Classes\PugIDE.Plantilla\DefaultIcon" "" "$INSTDIR\${APP_EXECUTABLE_FILENAME},0"
  WriteRegStr SHCTX "Software\Classes\PugIDE.Plantilla\shell\open\command" "" '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" "%1"'
  WriteRegStr SHCTX "Software\Classes\.pug\OpenWithProgids" "PugIDE.Plantilla" ""
  WriteRegStr SHCTX "Software\Classes\.jade\OpenWithProgids" "PugIDE.Plantilla" ""
  WriteRegStr SHCTX "Software\Classes\Applications\${APP_EXECUTABLE_FILENAME}\SupportedTypes" ".pug" ""
  WriteRegStr SHCTX "Software\Classes\Applications\${APP_EXECUTABLE_FILENAME}\SupportedTypes" ".jade" ""
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
!macroend

!macro customUnInstall
  DeleteRegValue SHCTX "Software\Classes\.pug\OpenWithProgids" "PugIDE.Plantilla"
  DeleteRegValue SHCTX "Software\Classes\.jade\OpenWithProgids" "PugIDE.Plantilla"
  DeleteRegKey SHCTX "Software\Classes\PugIDE.Plantilla"
  DeleteRegKey SHCTX "Software\Classes\Applications\${APP_EXECUTABLE_FILENAME}\SupportedTypes"
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
!macroend
