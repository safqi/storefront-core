/**
 * Shared semantic icon registry (Iconify names).
 *
 * Maps a stable, product-level semantic key (e.g. "cart", "user", "delivery")
 * to a concrete Iconify icon id. Consuming code references the *key*, never the
 * raw set name — so we can re-skin the whole product by editing this one file,
 * and the storefront theme + admin panel stay visually consistent.
 *
 * Primary set is Solar (`solar:*`, outline/linear by default). Brand marks use
 * `logos:*` / `mdi:*`. Every id below is verified to exist in the Iconify API.
 *
 * ⚠️ KEEP IN SYNC: an identical copy lives at
 *    resources/js/lib/iconMap.js  (admin panel)
 * The admin panel and the basic theme are separate Vite builds with separate
 * node_modules, so this map is intentionally duplicated. Edit both together.
 *
 * Usage: <Icon name="cart" className="text-lg" />  (see ../components/Icon.tsx)
 */
export const ICONS = {
    // ── Navigation & chrome ────────────────────────────────────────────────
    home: "solar:home-2-linear",
    search: "solar:magnifer-linear",
    menu: "solar:hamburger-menu-linear",
    close: "solar:close-circle-linear",
    closeSquare: "solar:close-square-linear",
    back: "solar:alt-arrow-left-linear",
    forward: "solar:alt-arrow-right-linear",
    chevronUp: "solar:alt-arrow-up-linear",
    chevronDown: "solar:alt-arrow-down-linear",
    chevronLeft: "solar:alt-arrow-left-linear",
    chevronRight: "solar:alt-arrow-right-linear",
    doubleLeft: "solar:double-alt-arrow-left-linear",
    doubleRight: "solar:double-alt-arrow-right-linear",
    more: "solar:menu-dots-linear",

    // ── Actions ────────────────────────────────────────────────────────────
    settings: "solar:settings-linear",
    tune: "solar:tuning-2-linear",
    filter: "solar:filter-linear",
    sort: "solar:sort-vertical-linear",
    check: "solar:check-circle-linear",
    checkRead: "solar:check-read-linear",
    add: "solar:add-circle-linear",
    remove: "solar:minus-circle-linear",
    edit: "solar:pen-2-linear",
    editSquare: "solar:pen-new-square-linear",
    delete: "solar:trash-bin-trash-linear",
    deleteMinimal: "solar:trash-bin-minimalistic-linear",
    copy: "solar:copy-linear",
    download: "solar:download-minimalistic-linear",
    upload: "solar:upload-minimalistic-linear",
    refresh: "solar:refresh-linear",
    restart: "solar:restart-linear",
    eye: "solar:eye-linear",
    eyeOff: "solar:eye-closed-linear",
    link: "solar:link-linear",
    external: "solar:arrow-right-up-linear",
    share: "solar:share-linear",
    print: "solar:printer-2-linear",
    qr: "solar:qr-code-linear",
    scan: "solar:scanner-linear",

    // ── Commerce ───────────────────────────────────────────────────────────
    cart: "solar:cart-large-2-linear",
    cartMinimal: "solar:cart-large-minimalistic-linear",
    cartAdd: "solar:cart-plus-linear",
    cartCheck: "solar:cart-check-linear",
    bag: "solar:bag-3-linear",
    bag4: "solar:bag-4-linear",
    bagHeart: "solar:bag-heart-linear",
    heart: "solar:heart-linear",
    heartFilled: "solar:heart-bold",
    star: "solar:star-linear",
    starFilled: "solar:star-bold",
    tag: "solar:tag-linear",
    tagPrice: "solar:tag-price-linear",
    sale: "solar:sale-linear",
    discount: "solar:ticket-sale-linear",
    coupon: "solar:ticket-linear",
    gift: "solar:gift-linear",
    wallet: "solar:wallet-linear",
    walletMoney: "solar:wallet-money-linear",
    card: "solar:card-linear",
    money: "solar:wad-of-money-linear",
    moneyBag: "solar:money-bag-linear",
    dollar: "solar:dollar-minimalistic-linear",
    delivery: "solar:delivery-linear",
    box: "solar:box-linear",
    boxMinimal: "solar:box-minimalistic-linear",
    product: "solar:box-linear",
    order: "solar:bill-list-linear",
    orderCheck: "solar:bill-check-linear",
    invoice: "solar:bill-list-linear",
    loyalty: "solar:medal-ribbon-linear",
    points: "solar:confetti-linear",

    // ── Catalog / merchandising ────────────────────────────────────────────
    category: "solar:widget-5-linear",
    layers: "solar:layers-minimalistic-linear",
    brand: "solar:crown-star-linear",
    image: "solar:gallery-linear",
    camera: "solar:camera-linear",
    video: "solar:videocamera-linear",
    play: "solar:play-circle-linear",
    pause: "solar:pause-circle-linear",

    // ── Account & auth ─────────────────────────────────────────────────────
    user: "solar:user-linear",
    userCircle: "solar:user-circle-linear",
    users: "solar:users-group-rounded-linear",
    logout: "solar:logout-2-linear",
    login: "solar:login-2-linear",
    lock: "solar:lock-linear",
    password: "solar:lock-password-linear",
    unlock: "solar:lock-unlocked-linear",
    key: "solar:key-linear",
    shield: "solar:shield-check-linear",
    shieldUser: "solar:shield-user-linear",
    bell: "solar:bell-linear",
    bellOff: "solar:bell-off-linear",

    // ── Communication & location ───────────────────────────────────────────
    phone: "solar:phone-linear",
    mail: "solar:letter-linear",
    chat: "solar:chat-round-linear",
    pin: "solar:map-point-linear",
    map: "solar:map-linear",
    globe: "solar:global-linear",
    language: "solar:global-linear",

    // ── Time ───────────────────────────────────────────────────────────────
    clock: "solar:clock-circle-linear",
    calendar: "solar:calendar-linear",
    history: "solar:history-linear",

    // ── Status & feedback ──────────────────────────────────────────────────
    info: "solar:info-circle-linear",
    warning: "solar:danger-triangle-linear",
    error: "solar:danger-circle-linear",
    success: "solar:check-circle-linear",
    question: "solar:question-circle-linear",

    // ── Admin / dashboard / data ───────────────────────────────────────────
    dashboard: "solar:widget-linear",
    grid: "solar:widget-4-linear",
    gridSmall: "solar:widget-2-linear",
    chart: "solar:chart-2-linear",
    graph: "solar:graph-up-linear",
    report: "solar:document-text-linear",
    list: "solar:list-linear",
    checklist: "solar:checklist-minimalistic-linear",
    folder: "solar:folder-linear",
    file: "solar:file-linear",
    document: "solar:document-linear",
    database: "solar:database-linear",
    server: "solar:server-linear",
    code: "solar:code-square-linear",
    inbox: "solar:inbox-linear",
    archive: "solar:archive-linear",
    notebook: "solar:notebook-linear",
    clipboard: "solar:clipboard-list-linear",
    theme: "solar:pallete-2-linear",
    palette: "solar:palette-linear",
    shop: "solar:shop-linear",
    store: "solar:shop-2-linear",
    building: "solar:buildings-2-linear",

    // ── Devices ────────────────────────────────────────────────────────────
    smartphone: "solar:smartphone-linear",
    laptop: "solar:laptop-linear",
    monitor: "solar:monitor-linear",

    // ── Misc / accents ─────────────────────────────────────────────────────
    fire: "solar:fire-linear",
    bolt: "solar:bolt-linear",
    crown: "solar:crown-linear",
    verified: "solar:verified-check-linear",
    flag: "solar:flag-linear",
    bookmark: "solar:bookmark-linear",
    sun: "solar:sun-linear",
    moon: "solar:moon-linear",
    rocket: "solar:rocket-2-linear",
    magic: "solar:magic-stick-3-linear",
    medal: "solar:medal-ribbon-linear",
    confetti: "solar:confetti-linear",

    // ── Vertical-specific (cosmetics / grocery / cafe) ─────────────────────
    cosmetic: "solar:cosmetic-linear",
    perfume: "solar:perfume-linear",
    testTube: "solar:test-tube-linear",
    pipette: "solar:pipette-linear",
    leaf: "solar:leaf-linear",
    water: "solar:waterdrop-linear",
    heartPulse: "solar:heart-pulse-linear",
    cup: "solar:cup-hot-linear",
    paw: "solar:paw-linear",
    forbidden: "solar:forbidden-circle-linear",
    bottle: "solar:bottle-linear",
    plate: "solar:plate-linear",

    // ── Brand marks (multi-color glyphs) ───────────────────────────────────
    whatsapp: "logos:whatsapp-icon",
    google: "logos:google-icon",
    facebook: "logos:facebook",
    instagram: "logos:instagram-icon",
    tiktok: "logos:tiktok-icon",
    snapchat: "mdi:snapchat",
    apple: "logos:apple",
    visa: "logos:visa",
    mastercard: "logos:mastercard",
} as const;

/** Semantic icon keys known to the registry. */
export type IconName = keyof typeof ICONS;

/**
 * Resolve a name to a concrete Iconify id.
 * - a semantic key from ICONS → its mapped id
 * - a raw Iconify id containing ":" (e.g. "mdi:home") → passed through
 * - a bare Solar name (e.g. "bag-3-bold") → prefixed with "solar:" (back-compat)
 */
export function resolveIcon(name: string): string {
    if (!name) return "";
    if (Object.prototype.hasOwnProperty.call(ICONS, name)) {
        return ICONS[name as IconName];
    }
    if (name.includes(":")) return name;
    return `solar:${name}`;
}
