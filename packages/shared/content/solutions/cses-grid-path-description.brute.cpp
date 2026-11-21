#include <string>
#include <vector>
#include <cstring>

class Solution {
    std::string d;
    bool vis[9][9];
    int dr[4] = {-1, 1, 0, 0}, dc[4] = {0, 0, -1, 1};
    const char* names = "UDLR";

    bool freeCell(int r, int c) {
        return r >= 0 && r < 7 && c >= 0 && c < 7 && !vis[r][c];
    }

    long long go(int step, int r, int c) {
        if (r == 6 && c == 0) return step == 48 ? 1 : 0;
        if (step == 48) return 0;
        if (!freeCell(r - 1, c) && !freeCell(r + 1, c) && freeCell(r, c - 1) && freeCell(r, c + 1)) return 0;
        if (!freeCell(r, c - 1) && !freeCell(r, c + 1) && freeCell(r - 1, c) && freeCell(r + 1, c)) return 0;

        long long total = 0;
        vis[r][c] = true;
        for (int k = 0; k < 4; k++) {
            if (d[step] != '?' && d[step] != names[k]) continue;
            int nr = r + dr[k], nc = c + dc[k];
            if (freeCell(nr, nc)) total += go(step + 1, nr, nc);
        }
        vis[r][c] = false;
        return total;
    }

public:
    int gridPathDescription(std::string description) {
        d = description;
        std::memset(vis, 0, sizeof vis);
        return (int)go(0, 0, 0);
    }
};
