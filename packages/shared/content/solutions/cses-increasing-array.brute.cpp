#include <vector>

class Solution {
public:
    long long increasingArray(std::vector<long long>& x) {
        long long moves = 0;
        std::vector<long long> arr = x;
        for (size_t i = 1; i < arr.size(); i++) {
            long long diff = arr[i - 1] - arr[i];
            if (diff > 0) {
                moves += diff;
                arr[i] = arr[i - 1];
            }
        }
        return moves;
    }
};
