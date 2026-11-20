(function () {
    const storageKey = "hvezdicka:reading-pet:v1";
    const dailyLimit = 12;
    const dateKey = () => new Date().toLocaleDateString("sv-SE");

    window.rewardPetCoin = function (activityId, amount = 1) {
        if (typeof activityId !== "string" || !activityId || !Number.isFinite(amount) || amount < 1) return false;
        try {
            const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
            const today = dateKey();
            const ledger = saved.practiceRewards?.date === today
                ? saved.practiceRewards
                : { date: today, ids: [] };
            if (!Array.isArray(ledger.ids)) ledger.ids = [];
            if (ledger.ids.includes(activityId) || ledger.ids.length >= dailyLimit) return false;

            const award = Math.min(Math.floor(amount), dailyLimit - ledger.ids.length);
            saved.coins = Math.max(0, Number(saved.coins) || 0) + award;
            ledger.ids.push(activityId);
            saved.practiceRewards = ledger;
            localStorage.setItem(storageKey, JSON.stringify(saved));
            window.dispatchEvent(new CustomEvent("petcoinreward", { detail: { amount: award, total: saved.coins } }));
            return true;
        } catch (error) {
            console.error("Odměnu pro čtecího mazlíčka se nepodařilo uložit.", error);
            return false;
        }
    };

    const toast = document.createElement("div");
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    toast.style.cssText = "position:fixed;z-index:9999;right:16px;bottom:16px;max-width:min(320px,calc(100vw - 32px));padding:10px 15px;border-radius:12px;background:#1c5d75;color:white;font:600 14px/1.4 'Segoe UI',Arial,sans-serif;box-shadow:0 5px 20px #26374630;opacity:0;pointer-events:none;transition:opacity .2s";
    document.addEventListener("DOMContentLoaded", function () { document.body.append(toast); });
    let hideToast;
    window.addEventListener("petcoinreward", function (event) {
        toast.textContent = `+${event.detail.amount} mince pro mazlíčka!`;
        toast.style.opacity = "1";
        clearTimeout(hideToast);
        hideToast = setTimeout(() => { toast.style.opacity = "0"; }, 2200);
    });
})();
