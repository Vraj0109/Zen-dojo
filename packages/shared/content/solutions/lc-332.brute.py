from collections import defaultdict

class Solution:
    def findItinerary(self, tickets: list[list[str]]) -> list[str]:
        g = defaultdict(list)
        for u, v in tickets:
            g[u].append([v, False])

        for u in g:
            g[u].sort(key=lambda x: x[0])

        route = ["JFK"]
        total_tickets = len(tickets)

        def dfs(u: str, used_tickets: int) -> bool:
            if used_tickets == total_tickets:
                return True

            for edge in g[u]:
                if not edge[1]:
                    edge[1] = True
                    route.append(edge[0])
                    if dfs(edge[0], used_tickets + 1):
                        return True
                    route.pop()
                    edge[1] = False
            return False

        dfs("JFK", 0)
        return route
