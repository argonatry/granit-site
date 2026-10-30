const root = document.documentElement;

export const env = {
  reduced: root.classList.contains('reduced'),
  lite: root.classList.contains('lite'),
  fine: window.matchMedia('(hover: hover) and (pointer: fine)').matches,
  firstVisit: root.classList.contains('first-visit'),
};

export const $ = <T extends Element = HTMLElement>(sel: string, scope: ParentNode = document) => scope.querySelector<T>(sel);
export const $$ = <T extends Element = HTMLElement>(sel: string, scope: ParentNode = document) => Array.from(scope.querySelectorAll<T>(sel));
