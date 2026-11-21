(() => {
    const storageKey = "miseUceni.background";
    const backgrounds = ["default", "lavender", "mint", "blue"];
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
        ["lavender", "Levandulové"],
        ["mint", "Mátové"],
        ["blue", "Modré"]
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
        if (backgrounds.includes(saved)) {
            select.value = saved;
            if (saved !== "default") document.body.dataset.background = saved;
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
