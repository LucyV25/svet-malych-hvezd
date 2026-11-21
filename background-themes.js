(() => {
    const storageKey = "miseUceni.background";
    const backgrounds = ["default", "night-sky", "forest", "ocean", "space"];
    const header = document.querySelector(".topbar");
    if (!header) return;

    const label = document.createElement("label");
    label.className = "site-background-control";
    label.htmlFor = "site-background-select";
    label.append(document.createTextNode("Pozadí"));

    const select = document.createElement("select");
    select.id = "site-background-select";
    select.setAttribute("aria-label", "Vyberte barvu pozadí");
    [
        ["default", "Jemné"],
        ["night-sky", "Hvězdná obloha"],
        ["forest", "Kouzelný les"],
        ["ocean", "Podmořský svět"],
        ["space", "Vesmírná výprava"]
    ].forEach(([value, text]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = text;
        select.append(option);
    });
    label.append(select);
    header.append(label);

    try {
        const saved = localStorage.getItem(storageKey);
        const migrated = { lavender: "night-sky", mint: "forest", blue: "ocean" }[saved] || saved;
        if (backgrounds.includes(migrated)) {
            select.value = migrated;
            if (migrated !== "default") document.body.dataset.background = migrated;
            if (migrated !== saved) localStorage.setItem(storageKey, migrated);
        }
    } catch {
        // Keep the selector usable for the current visit if storage is unavailable.
    }

    select.addEventListener("change", () => {
        if (select.value === "default") delete document.body.dataset.background;
        else document.body.dataset.background = select.value;
        try {
            localStorage.setItem(storageKey, select.value);
        } catch {
            // The selected background still applies until this page is closed.
        }
    });
})();
