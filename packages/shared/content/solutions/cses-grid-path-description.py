# verify: skip-stress
class Solution:
    def gridPathDescription(self, description: str) -> int:
        d = description
        vis = [1] * 81
        for r in range(1, 8):
            b = r * 9
            for c in range(1, 8):
                vis[b + c] = 0

        ch_k = {'U': -9, 'D': 9, 'L': -1, 'R': 1}
        p = [0 if c == '?' else ch_k[c] for c in d]

        if p[47] == -9 or p[47] == 1 or p[0] == -9 or p[0] == -1:
            return 0

        def go(step: int, pos: int) -> int:
            if pos == 64:
                return 1 if step == 48 else 0
            if step == 48:
                return 0

            up, down = pos - 9, pos + 9
            left, right = pos - 1, pos + 1
            v_up, v_down = vis[up], vis[down]
            v_left, v_right = vis[left], vis[right]

            if v_up and v_down and not (v_left or v_right):
                return 0
            if v_left and v_right and not (v_up or v_down):
                return 0

            if vis[pos - 8] and not v_up and not v_right and (v_down or v_left):
                return 0
            if vis[pos - 10] and not v_up and not v_left and (v_down or v_right):
                return 0
            if vis[pos + 8] and not v_down and not v_left and (v_up or v_right):
                return 0
            if vis[pos + 10] and not v_down and not v_right and (v_up or v_left):
                return 0

            vis[pos] = 1
            total = 0
            move = p[step]
            if move:
                npos = pos + move
                if not vis[npos]:
                    total = go(step + 1, npos)
            else:
                if not v_down:
                    total += go(step + 1, down)
                if not v_right:
                    total += go(step + 1, right)
                if not v_up:
                    total += go(step + 1, up)
                if not v_left:
                    total += go(step + 1, left)
            vis[pos] = 0
            return total

        return go(0, 10)
