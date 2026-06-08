"""
DARWIN's Four Strategy Genes.
Each gene is a distinct trading hypothesis.
They compete in paper trade; only the fittest executes real trades.
"""

import math
import random
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class PaperTrade:
    """A simulated trade used to calculate gene fitness."""
    token: str
    side: str  # BUY | SELL
    entry_price: float
    exit_price: Optional[float] = None
    pnl_pct: Optional[float] = None
    pnl_usd: Optional[float] = None
    timestamp: float = 0.0
    closed: bool = False


@dataclass
class Gene:
    """A single trading strategy gene."""
    name: str                    # PULSE, WAVE, GRAVITY, PHANTOM
    description: str
    trigger_threshold: float     # e.g. volume_ratio > 2.5
    hold_time_hours: int         # e.g. 4
    stop_loss_pct: float         # e.g. -1.5
    take_profit_pct: float       # e.g. 3.0
    position_size_mult: float    # 0.5-1.0 of base size
    generation: int = 1
    fitness_score: float = 0.0
    paper_trades: list = field(default_factory=list)
    active_paper_trade: Optional[PaperTrade] = None

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "description": self.description,
            "trigger_threshold": self.trigger_threshold,
            "hold_time_hours": self.hold_time_hours,
            "stop_loss_pct": self.stop_loss_pct,
            "take_profit_pct": self.take_profit_pct,
            "position_size_mult": self.position_size_mult,
            "generation": self.generation,
            "fitness_score": self.fitness_score,
            "paper_trades": [
                {"token": t.token, "side": t.side, "pnl_pct": t.pnl_pct, "closed": t.closed}
                for t in self.paper_trades[-20:]
            ],
        }


def create_default_genes() -> list:
    """Create the 4 initial strategy genes."""
    return [
        Gene(
            name="PULSE",
            description="Volume Surge Detection — sudden volume spikes predict short-term price continuation",
            trigger_threshold=2.5,
            hold_time_hours=3,
            stop_loss_pct=-1.5,
            take_profit_pct=3.0,
            position_size_mult=0.5,
        ),
        Gene(
            name="WAVE",
            description="Social Velocity Momentum — social attention precedes price movement by 2-6 hours",
            trigger_threshold=40.0,
            hold_time_hours=6,
            stop_loss_pct=-2.0,
            take_profit_pct=5.0,
            position_size_mult=0.65,
        ),
        Gene(
            name="GRAVITY",
            description="Mean Reversion on Quality Tokens — quality BEP-20 tokens revert after panic dips",
            trigger_threshold=-6.0,
            hold_time_hours=18,
            stop_loss_pct=-3.0,
            take_profit_pct=4.0,
            position_size_mult=0.8,
        ),
        Gene(
            name="PHANTOM",
            description="Narrative Category Rotation — laggard tokens in trending categories have upside",
            trigger_threshold=8.0,
            hold_time_hours=9,
            stop_loss_pct=-2.5,
            take_profit_pct=6.0,
            position_size_mult=0.6,
        ),
    ]


def calculate_fitness(gene: Gene) -> float:
    """
    Fitness = win_rate * profit_factor * recency_weight
    Recent trades weighted 1.5x more than older ones.
    """
    trades = [t for t in gene.paper_trades if t.closed]
    if not trades:
        return 0.0

    wins = [t for t in trades if t.pnl_pct and t.pnl_pct > 0]
    losses = [t for t in trades if t.pnl_pct and t.pnl_pct <= 0]

    win_rate = len(wins) / len(trades) if trades else 0
    avg_win = sum(t.pnl_pct for t in wins) / len(wins) if wins else 0
    avg_loss = abs(sum(t.pnl_pct for t in losses) / len(losses)) if losses else 0.001
    profit_factor = avg_win / avg_loss if avg_loss > 0 else 1.0
    recent = trades[-3:]
    recency_weight = 1.0 + (len(recent) / len(trades)) * 0.5 if trades else 1.0
    fitness = win_rate * profit_factor * recency_weight
    return round(fitness, 4)


def evolve(genes: list) -> list:
    """
    Called once per day at 00:00 UTC.
    The weakest gene mutates toward the strongest gene's parameters.
    """
    for gene in genes:
        gene.fitness_score = calculate_fitness(gene)

    sorted_genes = sorted(genes, key=lambda g: g.fitness_score)
    loser = sorted_genes[0]
    winner = sorted_genes[-1]

    loser.trigger_threshold = round(
        loser.trigger_threshold * 0.7 + winner.trigger_threshold * 0.3, 4
    )
    loser.hold_time_hours = int(loser.hold_time_hours * 0.7 + winner.hold_time_hours * 0.3)
    loser.stop_loss_pct = round(
        loser.stop_loss_pct * 0.7 + winner.stop_loss_pct * 0.3, 4
    )
    loser.take_profit_pct = round(
        loser.take_profit_pct * 0.7 + winner.take_profit_pct * 0.3, 4
    )
    loser.paper_trades = []
    loser.fitness_score = 0.0
    loser.generation += 1

    print(f"  EVOLUTION: {loser.name} mutated (Gen {loser.generation}). "
          f"Adapting toward {winner.name}'s parameters.")
    return genes


class GenePool:
    """Manages all 4 genes: scoring, evolution, winner selection."""

    def __init__(self, genes_data: dict = None):
        if genes_data:
            self.genes = self._from_dict(genes_data)
        else:
            self.genes = create_default_genes()

    def _from_dict(self, data: dict) -> list:
        genes = []
        for name in ["PULSE", "WAVE", "GRAVITY", "PHANTOM"]:
            gd = data.get(name, {})
            gene = Gene(
                name=name,
                description=gd.get("description", ""),
                trigger_threshold=gd.get("trigger_threshold", 0),
                hold_time_hours=gd.get("hold_time_hours", 4),
                stop_loss_pct=gd.get("stop_loss_pct", -2),
                take_profit_pct=gd.get("take_profit_pct", 3),
                position_size_mult=gd.get("position_size_mult", 0.5),
                generation=gd.get("generation", 1),
                fitness_score=gd.get("fitness_score", 0.0),
            )
            genes.append(gene)
        return genes

    def update_fitness_scores(self) -> dict:
        scores = {}
        for gene in self.genes:
            gene.fitness_score = calculate_fitness(gene)
            scores[gene.name] = gene.fitness_score
        return scores

    def get_winner(self) -> Gene:
        return max(self.genes, key=lambda g: g.fitness_score)

    def evolve(self):
        evolve(self.genes)

    def to_dict(self) -> dict:
        return {g.name: g.to_dict() for g in self.genes}

    def simulate_paper_trade(self, gene: Gene, token: str, side: str,
                             entry_price: float, exit_price: float):
        pnl_pct = ((exit_price - entry_price) / entry_price) * 100
        if side == "SELL":
            pnl_pct = -pnl_pct
        trade = PaperTrade(
            token=token, side=side, entry_price=entry_price,
            exit_price=exit_price, pnl_pct=round(pnl_pct, 2),
            pnl_usd=0, closed=True,
        )
        gene.paper_trades.append(trade)
