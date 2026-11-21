#include <vector>
#include <string>

using namespace std;

class Solution {
    bool dfs(const vector<vector<string>>& board, const string& word, int r, int c, int idx, vector<vector<bool>>& visited) {
        if (idx == (int)word.size()) return true;
        int m = (int)board.size();
        int n = (int)board[0].size();
        if (r < 0 || r >= m || c < 0 || c >= n || visited[r][c] || board[r][c][0] != word[idx]) {
            return false;
        }

        visited[r][c] = true;
        int dr[4] = {0, 0, 1, -1};
        int dc[4] = {1, -1, 0, 0};
        for (int i = 0; i < 4; ++i) {
            if (dfs(board, word, r + dr[i], c + dc[i], idx + 1, visited)) {
                visited[r][c] = false;
                return true;
            }
        }
        visited[r][c] = false;
        return false;
    }

    bool exists(const vector<vector<string>>& board, const string& word) {
        int m = (int)board.size();
        int n = (int)board[0].size();
        vector<vector<bool>> visited(m, vector<bool>(n, false));
        for (int r = 0; r < m; ++r) {
            for (int c = 0; c < n; ++c) {
                if (dfs(board, word, r, c, 0, visited)) {
                    return true;
                }
            }
        }
        return false;
    }

public:
    vector<string> findWords(vector<vector<string>>& board, vector<string>& words) {
        vector<string> result;
        for (const string& w : words) {
            if (exists(board, w)) {
                result.push_back(w);
            }
        }
        return result;
    }
};
