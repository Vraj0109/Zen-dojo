class Solution:
    def findMaximizedCapital(self, k: int, w: int, profits: list[int], capital: list[int]) -> int:
        n = len(profits)
        used = [False] * n
        money = w
        for _ in range(k):
            best_idx = -1
            best_profit = -1
            for i in range(n):
                if not used[i] and capital[i] <= money:
                    if profits[i] > best_profit:
                        best_profit = profits[i]
                        best_idx = i
            if best_idx == -1:
                break
            used[best_idx] = True
            money += best_profit
        return money
