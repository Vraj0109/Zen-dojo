#include <vector>
#include <algorithm>

using namespace std;

class MedianFinder {
    vector<int> nums;

public:
    MedianFinder() {}

    void addNum(int num) {
        nums.push_back(num);
    }

    double findMedian() {
        vector<int> copy = nums;
        sort(copy.begin(), copy.end());
        int n = copy.size();
        if (n % 2 == 1) {
            return copy[n / 2];
        } else {
            return (copy[n / 2 - 1] + copy[n / 2]) / 2.0;
        }
    }
};
