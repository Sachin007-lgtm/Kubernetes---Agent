import pandas as pd
import numpy as np

def verify():
    df = pd.read_csv("docs/experiment_results.csv")
    print("=== Table III: Accuracy by Scenario and System ===")
    acc = df.groupby(["scenario", "system"])["prediction_correct"].mean() * 100
    print(acc.unstack())
    
    print("\n=== Table IV: Diagnosis Latency (mean ± std) ===")
    for system in df["system"].unique():
        sub = df[df["system"] == system]
        if "Manual" in system:
            # in minutes
            m = sub["latency_seconds"] / 60
            print(f"{system}: {m.mean():.1f} ± {m.std():.1f} min")
        else:
            s = sub["latency_seconds"]
            print(f"{system}: {s.mean():.1f} ± {s.std():.1f} sec")
            
    print("\n=== Table V: Confidence Scores for Our Agent ===")
    agent = df[df["system"] == "Our Agent"]
    conf = agent.groupby("failure_type")["confidence_score"].agg(["mean", "std"])
    print(conf)

if __name__ == "__main__":
    verify()
