import unittest

import numpy as np
from fastapi.testclient import TestClient

from backend.api.dashboard import summarize_periods
from backend.api.main import app
from backend.api.tests import IsolatedRunHistory


class DashboardTests(IsolatedRunHistory, unittest.TestCase):
    def test_period_boundaries_and_partial_years(self):
        charts = summarize_periods(np.array([0, 500_000, 0, 200_000, 800_000, 0, 0]),
                                   np.array([0, 1, 0, 1, 2, 0, 0]))
        self.assertEqual(charts[1]["loss_counts"][:3], [4, 1, 2])
        self.assertEqual(charts[3]["periods"], 2)
        self.assertEqual(charts[3]["incident_counts"], [0, 1, 0, 1])
        self.assertEqual(charts[3]["mean_loss_usd"], 750_000)
        self.assertEqual(charts[5]["mean_loss_usd"], 1_500_000)
        self.assertEqual(list(summarize_periods(np.zeros(1), np.zeros(1, dtype=int))), [1])

    def test_saved_run_matches_original_simulation_and_survives_reread(self):
        client = TestClient(app)
        url = "/api/dashboard/runs"
        self.assertEqual(client.get(url).json(), [])
        args = {"years": 503, "seed": 19, "investment_ids": ["I06"], "budget_usd": 300_000}
        result = client.post("/api/simulate", json=args).json()
        summary, = client.get(url).json()
        detail = client.get(f"{url}/{summary['id']}").json()
        self.assertEqual(set(detail["strategies"]), {"baseline", "ciso"})
        for key, data in detail["strategies"].items():
            self.assertEqual(data["investments"], result["portfolios"][key])
            annual = data["horizons"]["1"]
            self.assertEqual(annual["mean_loss_usd"], result["simulated"]["strategies"][key]["mean_annual_loss_usd"])
            self.assertEqual(annual["p95_loss_usd"], result["simulated"]["strategies"][key]["p95_annual_loss_usd"])
            self.assertAlmostEqual(data["events_per_year"] * data["mean_loss_per_event_usd"], data["expected_annual_loss_usd"])
            for years, h in data["horizons"].items():
                self.assertEqual(h["periods"], args["years"] // int(years))
                self.assertEqual(sum(h["loss_counts"]), h["periods"])
                self.assertEqual(sum(h["incident_counts"]), h["periods"])
        created = client.post(url, json={**args, "seed": 2})
        self.assertEqual(created.status_code, 201)
        self.assertEqual(client.get(url).json()[0]["id"], created.json()["id"])
        self.assertEqual(client.get(f"{url}/{summary['id']}").json(), detail)
        self.assertEqual(client.post(url, json={"years": 0}).status_code, 422)
        self.assertEqual(len(client.get(url).json()), 2)
        self.assertEqual(client.get(f"{url}/99999").status_code, 404)
