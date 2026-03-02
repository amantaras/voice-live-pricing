"""Playwright script to capture screenshots of the Voice Live Pricing Calculator."""
import os
from playwright.sync_api import sync_playwright

URL = "http://localhost:8080"
OUT = os.path.join(os.path.dirname(__file__), "docs", "images")
os.makedirs(OUT, exist_ok=True)

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.goto(URL, wait_until="networkidle")
        page.wait_for_timeout(1000)

        # 1. Full dashboard overview
        page.screenshot(path=os.path.join(OUT, "01-dashboard-overview.png"), full_page=True)
        print("1/8 Dashboard overview")

        # 2. Config panel (region, currency, customer, quote)
        config = page.locator(".config-panel")
        config.screenshot(path=os.path.join(OUT, "02-config-panel.png"))
        print("2/8 Config panel")

        # 3. Tier selection cards
        tier_section = page.locator(".tier-grid")
        tier_section.screenshot(path=os.path.join(OUT, "03-tier-selection.png"))
        print("3/8 Tier selection")

        # 4. Click Standard tier to show model/llm mode change
        page.locator('.tier-card[data-tier="standard"]').click()
        page.wait_for_timeout(300)
        tier_section.screenshot(path=os.path.join(OUT, "04-tier-standard-selected.png"))
        print("4/8 Standard tier selected")

        # 5. Fill in call estimator with sample data for a realistic view
        page.locator("#vlHoursPerMonth").fill("100")
        page.locator("#vlHoursPerMonth").dispatch_event("input")
        page.wait_for_timeout(500)

        # Voice Live call estimator section
        estimator = page.locator(".call-estimator")
        estimator.screenshot(path=os.path.join(OUT, "05-call-estimator.png"))
        print("5/8 Call estimator")

        # 6. Token breakdown table
        token_details = page.locator("#tokenDetails")
        if not token_details.is_visible():
            page.locator("#toggleTokenDetails").click()
            page.wait_for_timeout(300)
        token_details.screenshot(path=os.path.join(OUT, "06-token-breakdown.png"))
        print("6/8 Token breakdown")

        # 7. Cost summary sidebar
        summary = page.locator(".pricing-summary")
        summary.screenshot(path=os.path.join(OUT, "07-cost-summary.png"))
        print("7/8 Cost summary")

        # 8. Show additional services by making hidden sections visible via JS
        page.locator('.tier-card[data-tier="pro"]').click()
        page.wait_for_timeout(300)

        # Unhide and enable STT, TTS, Translation sections via JS
        for section_id in ["sttSection", "ttsSection", "translationSection"]:
            page.evaluate(f"""() => {{
                const s = document.getElementById('{section_id}');
                if (s) {{ s.style.display = ''; }}
            }}""")
        # Check the toggles
        for toggle_id in ["toggleSTT", "toggleTTS", "toggleTranslation"]:
            toggle = page.locator(f"#{toggle_id}")
            if toggle.is_visible():
                toggle.check()
        page.wait_for_timeout(500)

        # Final full-page screenshot with additional services visible
        page.screenshot(path=os.path.join(OUT, "08-full-page-with-services.png"), full_page=True)
        print("8/8 Full page with additional services")

        browser.close()
        print(f"\nAll screenshots saved to {OUT}")

if __name__ == "__main__":
    main()
