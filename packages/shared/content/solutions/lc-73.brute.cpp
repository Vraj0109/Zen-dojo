#include <vector>

using namespace std;

class Solution {
public:
    vector<vector<int>> setZeroes(vector<vector<int>>& matrix) {
        int r = matrix.size(), c = matrix[0].size();
        vector<vector<int>> copy = matrix;
        for (int i = 0; i < r; i++) {
            for (int j = 0; j < c; j++) {
                if (matrix[i][j] == 0) {
                    for (int k = 0; k < c; k++) copy[i][k] = 0;
                    for (int k = 0; k < r; k++) copy[k][j] = 0;
                }
            }
        }
        return copy;
    }
};
