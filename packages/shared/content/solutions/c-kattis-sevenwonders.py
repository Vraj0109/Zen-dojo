class Solution:
    def sevenWondersScore(self, cards: str) -> int:
        t = cards.count('T')
        c = cards.count('C')
        g = cards.count('G')
        return t * t + c * c + g * g + 7 * min(t, c, g)
