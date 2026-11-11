class Solution:
    def hulkFeelings(self, n: int) -> str:
        parts = []
        for i in range(1, n + 1):
            parts.append("I hate" if i % 2 == 1 else "I love")
        return " that ".join(parts) + " it"
