#include <vector>
#include <string>

class Solution {
public:
    std::vector<std::string> gridColoring(std::vector<std::string>& grid) {
        int r = grid.size(), c = grid[0].size();
        std::vector<std::string> out(r, std::string(c, 'A'));
        for (int i = 0; i < r; i++) {
            for (int j = 0; j < c; j++) {
                for (char ch = 'A'; ch <= 'D'; ch++) {
                    if (ch == grid[i][j]) continue;
                    if (j > 0 && out[i][j - 1] == ch) continue;
                    if (i > 0 && out[i - 1][j] == ch) continue;
                    out[i][j] = ch;
                    break;
                }
            }
        }
        return out;
    }
};
