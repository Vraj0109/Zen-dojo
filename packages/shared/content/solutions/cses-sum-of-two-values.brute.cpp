#include <vector>

class Solution {
public:
    std::vector<int> sumOfTwoValues(std::vector<int>& arr, int target) {
        int n = arr.size();
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                if (arr[i] + arr[j] == target) {
                    return {i + 1, j + 1};
                }
            }
        }
        return {-1, -1};
    }
};
