#include <vector>
#include <algorithm>

using namespace std;

class Solution {
public:
    int maximalSquare(vector<vector<int>>& matrix) {
        int R = matrix.size();
        if (R == 0) return 0;
        int C = matrix[0].size();
        int maxSide = 0;

        for (int r = 0; r < R; r++) {
            for (int c = 0; c < C; c++) {
                if (matrix[r][c] == 1) {
                    maxSide = max(maxSide, 1);
                    int maxK = min(R - r, C - c);
                    for (int k = 2; k <= maxK; k++) {
                        bool allOnes = true;
                        for (int i = 0; i < k; i++) {
                            for (int j = 0; j < k; j++) {
                                if (matrix[r + i][c + j] != 1) {
                                    allOnes = false;
                                    break;
                                }
                            }
                            if (!allOnes) break;
                        }
                        if (allOnes) maxSide = max(maxSide, k);
                        else break;
                    }
                }
            }
        }
        return maxSide * maxSide;
    }
};
