#include <vector>

class Solution {
    void hanoi(int n, int from, int to, int aux, std::vector<std::vector<int>>& moves) {
        if (n == 0) return;
        hanoi(n - 1, from, aux, to, moves);
        moves.push_back({from, to});
        hanoi(n - 1, aux, to, from, moves);
    }
public:
    std::vector<std::vector<int>> towerOfHanoi(int n) {
        std::vector<std::vector<int>> moves;
        hanoi(n, 1, 3, 2, moves);
        return moves;
    }
};
