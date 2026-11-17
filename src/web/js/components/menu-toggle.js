const MENU_BUTTON_MARKUP = `
  <button type="button" class="menu-toggle" aria-label="Toggle navigation menu"
    data-i18n-aria-label="dashboardToggleMenu">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor"
        stroke-width="2" stroke-linecap="round"></path>
    </svg>
  </button>
`;

class MenuToggle extends HTMLElement {
  connectedCallback() {
    const menuId = this.getAttribute('controls');
    const menu = menuId && this.ownerDocument.getElementById(menuId);
    if (!menu) return;

    this.innerHTML = MENU_BUTTON_MARKUP;
    const button = this.querySelector('button');
    const navigation = menu.querySelector('nav');
    let expanded = !menu.hidden;
    let animation;
    let navigationAnimation;
    button.setAttribute('aria-controls', menuId);
    button.setAttribute('aria-expanded', String(expanded));

    button.addEventListener('click', () => {
      expanded = !expanded;
      button.setAttribute('aria-expanded', String(expanded));
      menu.inert = !expanded;

      const styles = getComputedStyle(menu);
      const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const dimension = styles.getPropertyValue('--sidebar-axis').trim() === 'height'
        ? 'height' : 'width';
      const property = reducedMotion ? 'opacity' : dimension;
      const collapsed = reducedMotion ? '0' : '0px';
      const start = menu.hidden ? collapsed : styles[property];
      const offscreen = dimension === 'height' ? 'translateY(-100%)' : 'translateX(-100%)';
      const startTransform = navigation && !menu.hidden
        ? getComputedStyle(navigation).transform : offscreen;
      animation?.cancel();
      navigationAnimation?.cancel();
      animation = null;
      navigationAnimation = null;

      if (!menu.animate) {
        menu.hidden = !expanded;
        return;
      }

      menu.hidden = false;
      const end = expanded ? getComputedStyle(menu)[property] : collapsed;
      const timing = { duration: reducedMotion ? 120 : 240, easing: 'ease-in-out', fill: 'both' };
      const slide = menu.animate(
        [{ [property]: start }, { [property]: end }],
        timing
      );
      animation = slide;

      if (!reducedMotion && navigation) {
        navigationAnimation = navigation.animate(
          [{ transform: startTransform }, { transform: expanded ? 'none' : offscreen }],
          timing
        );
      }

      slide.onfinish = () => {
        if (animation !== slide) return;
        menu.hidden = !expanded;
        slide.cancel();
        navigationAnimation?.cancel();
        animation = null;
        navigationAnimation = null;
      };
    });
  }
}

if (!customElements.get('menu-toggle')) {
  customElements.define('menu-toggle', MenuToggle);
}
