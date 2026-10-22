/** Proyecto inicial de PugIDE (sesión nueva o "Nuevo proyecto"). */
export const DEFAULT_PROJECT_NAME = 'MiProyecto';

export const DEFAULT_MAIN_PUG = `doctype html
html(lang="es")
  head
    meta(charset="UTF-8")
    meta(name="viewport" content="width=device-width, initial-scale=1.0")
    title PugIDE
  body
    h1 Hola, #{nombre}
    p Empieza a editar tu plantilla Pug y los datos aqui.
    include ./mixins`;

export const DEFAULT_MIXINS_PUG = `//- Define aqui tus mixins y usalos en main.pug con +nombre(args)
mixin saludo(nombre)
  p Hola, #{nombre}
`;

export const DEFAULT_PROJECT_DATA: Record<string, unknown> = { nombre: 'Mundo' };

export function defaultProjectFiles(): Map<string, string> {
  return new Map([
    ['/main.pug', DEFAULT_MAIN_PUG],
    ['/mixins.pug', DEFAULT_MIXINS_PUG],
  ]);
}
