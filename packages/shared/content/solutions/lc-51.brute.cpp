#include <vector>
#include <string>
#include <algorithm>
#include <cmath>

using namespace std;

class Solution {
    bool is_valid(const vector<int>& p, int n) {
        for (int i = 0; i < n; ++i) {
            for (int j = i + 1; j < n; ++j) {
                if (abs(p[i] - p[j]) == abs(i - j)) {
                    return false;
                }
            }
        }
        return true;
    }

public:
    vector<vector<string>> solveNQueens(int n) {
        vector<int> p(n);
        for (int i = 0; i < n; ++i) p[i] = i;

        vector<vector<string>> res;
        do {
            if (is_valid(p, n)) {
                vector<string> board(n, string(n, '.'));
                for (int r = 0; r < n; ++r) {
                    board[r][p[r]] = 'Q';
                }
                res.push_back(board);
            }
        } while (next_permutation(p.begin(), p.end()));

        return res;
    }
};
