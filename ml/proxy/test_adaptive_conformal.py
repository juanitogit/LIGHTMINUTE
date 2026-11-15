import unittest

from adaptive_conformal import AdaptiveConformal


class ConformalTests(unittest.TestCase):
    def test_warmup_prediction_and_miss_adaptation(self):
        model = AdaptiveConformal(window=3, alpha=.05, learning_rate=.01)
        for value in (1, 2, 3):
            self.assertIsNone(model.interval(0))
            self.assertIsNone(model.observe(0, value))
        self.assertEqual(model.interval(0), (-3, 3))
        self.assertEqual(model.observe(0, 9), 1)
        self.assertLess(model.current, model.target)
        self.assertEqual(model.interval(0), (-9, 9))

    def test_rejects_nonfinite_without_mutating(self):
        model = AdaptiveConformal(window=3)
        with self.assertRaises(ValueError):
            model.observe(0, float("nan"))
        self.assertEqual(len(model.scores), 0)

    def test_fixed_alpha_does_not_adapt(self):
        model = AdaptiveConformal(window=2, adaptive=False)
        model.observe(0, 1); model.observe(0, 1); model.observe(0, 4)
        self.assertEqual(model.current, model.target)


if __name__ == "__main__":
    unittest.main()
