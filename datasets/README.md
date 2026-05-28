# OXYCORP Dataset Assets

This folder contains the training datasets used by the OXYCORP ML engine.

Files:
- `career_training.csv` — synthetic career outcome data for music artists. Includes audience, revenue, and engagement features plus a target career score.
- `skill_training.csv` — synthetic skill assessment responses and a target overall skill score.

These CSV files are built for local training and demonstration purposes. To train the models from these datasets, run:

```bash
python ml/train_models.py
```

This creates serialized regression models in `ml_models/` that `ml_service.py` will load if available.
