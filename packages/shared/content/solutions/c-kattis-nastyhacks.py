class Solution:
    def nastyHacksDecision(self, r: int, e: int, c: int) -> str:
        net = e - c
        if net > r:
            return "advertise"
        if net == r:
            return "does not matter"
        return "do not advertise"
