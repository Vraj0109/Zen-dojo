import type { ProblemSpec } from "./types";

// CSES Geometry and String Algorithms problem specifications.
// Statements, hints, and explanations are written for this app in our own words; original tasks are linked.

export const CSES_SPECS_GEO_STR: ProblemSpec[] = [
  // ==========================================
  // Geometry
  // ==========================================
  {
    id: "cses-point-location-test",
    source: "cses",
    title: "Point Location Test",
    url: "https://cses.fi/problemset/task/2189",
    statement: [
      "There is a directed line that passes through points p1 = (x1, y1) and p2 = (x2, y2).",
      "You are given a third point p3 = (x3, y3). Your task is to determine whether p3 is located on the left side of the directed line, on the right side of the directed line, or directly touches the line.",
      "You are given an array of queries, each containing [x1, y1, x2, y2, x3, y3]. For each query, return 'LEFT', 'RIGHT', or 'TOUCH'."
    ],
    constraints: [
      "1 <= queries.length <= 100000",
      "-10^9 <= x1, y1, x2, y2, x3, y3 <= 10^9",
      "p1 != p2 in all queries"
    ],
    fn: {
      name: "pointLocationTest",
      params: [{ name: "queries", type: "int[][]" }],
      returns: "string[]"
    },
    examples: [
      {
        input: [[[4, 2, 2, 5, 4, 5], [1, 1, 2, 2, 3, 3], [1, 1, 4, 4, 1, 2]]],
        output: ["RIGHT", "TOUCH", "LEFT"],
        explanation: "The cross product of vector (p2 - p1) with (p3 - p1) determines orientation: negative is RIGHT, zero is TOUCH, positive is LEFT."
      }
    ],
    tests: [
      {
        input: [[[0, 0, 5, 0, 2, 3], [0, 0, 5, 0, 2, -3], [0, 0, 5, 0, 3, 0]]],
        output: ["LEFT", "RIGHT", "TOUCH"]
      },
      {
        input: [[[0, 0, 0, 5, -1, 2], [0, 0, 0, 5, 1, 2], [0, 0, 0, 5, 0, 2]]],
        output: ["LEFT", "RIGHT", "TOUCH"]
      },
      {
        input: [[[5, 0, 0, 0, 2, 3], [5, 0, 0, 0, 2, -3]]],
        output: ["RIGHT", "LEFT"]
      },
      {
        input: [[[-10, -10, 10, 10, -5, 5], [1, 1, 2, 2, 10, 10], [1, 1, 2, 2, -5, -5]]],
        output: ["LEFT", "TOUCH", "TOUCH"]
      },
      {
        input: [[[0, 0, 1000000000, 1000000000, 999999999, 1000000000]]],
        output: ["LEFT"]
      },
      {
        input: [[[0, 0, 1000000000, 1000000000, 1000000000, 999999999]]],
        output: ["RIGHT"]
      }
    ],
    hints: [
      "Whether a point is on the left, on the right, or on the line is a question about the direction of a turn. How can one number tell you the turn direction?",
      "Take the cross product of the line's direction and the vector to the point. It is positive on one side, negative on the other, and zero on the line.",
      "Compute the cross product with the given formula in 64-bit integers, then map its sign to the answer.",
      "Coordinates are large, so products of differences can exceed 32 bits. Use 64-bit integers.",
    ],
    solution: {
      idea: [
        "Compute the cross product (x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1) using 64-bit integers.",
        "A positive cross product indicates a left turn, negative indicates a right turn, and zero indicates that the three points are collinear."
      ],
      complexity: "O(1) time per query, O(1) auxiliary space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<string> pointLocationTest(vector<vector<int>>& queries) {
        vector<string> ans;
        ans.reserve(queries.size());
        for (const auto& q : queries) {
            long long x1 = q[0], y1 = q[1];
            long long x2 = q[2], y2 = q[3];
            long long x3 = q[4], y3 = q[5];
            long long cross = (x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1);
            if (cross > 0) ans.push_back("LEFT");
            else if (cross < 0) ans.push_back("RIGHT");
            else ans.push_back("TOUCH");
        }
        return ans;
    }
};
`
    }
  },
  {
    id: "cses-line-segment-intersection",
    source: "cses",
    title: "Line Segment Intersection",
    url: "https://cses.fi/problemset/task/2190",
    statement: [
      "There are two line segments in a 2D plane: the first segment connects (x1, y1) and (x2, y2), and the second segment connects (x3, y3) and (x4, y4).",
      "Your task is to determine whether the two line segments intersect (touching at endpoints or overlapping along a segment also counts as an intersection).",
      "You are given an array of queries, each containing [x1, y1, x2, y2, x3, y3, x4, y4]. Return an array of strings with 'YES' if the segments intersect and 'NO' otherwise."
    ],
    constraints: [
      "1 <= queries.length <= 100000",
      "-10^9 <= x1, y1, x2, y2, x3, y3, x4, y4 <= 10^9"
    ],
    fn: {
      name: "lineSegmentIntersection",
      params: [{ name: "queries", type: "int[][]" }],
      returns: "string[]"
    },
    examples: [
      {
        input: [[[1, 1, 5, 3, 2, 3, 4, 1], [1, 1, 5, 3, 2, 4, 4, 2], [1, 1, 5, 3, 2, 5, 4, 4], [1, 1, 5, 3, 3, 2, 7, 4]]],
        output: ["YES", "YES", "NO", "YES"],
        explanation: "The first two pairs intersect in their interiors, the third pair does not intersect, and the fourth pair are overlapping collinear segments."
      }
    ],
    tests: [
      {
        input: [[[0, 0, 4, 0, 2, 0, 2, 3]]],
        output: ["YES"]
      },
      {
        input: [[[0, 0, 2, 2, 2, 2, 4, 1]]],
        output: ["YES"]
      },
      {
        input: [[[0, 0, 2, 2, 0, 1, 2, 3]]],
        output: ["NO"]
      },
      {
        input: [[[0, 0, 1, 1, 2, 2, 3, 3]]],
        output: ["NO"]
      },
      {
        input: [[[0, 0, 4, 4, 0, 4, 4, 0]]],
        output: ["YES"]
      },
      {
        input: [[[1, 2, 3, 4, 1, 2, 3, 4]]],
        output: ["YES"]
      }
    ],
    hints: [
      "Two segments can cross, touch at an endpoint, or overlap while on one line. Which tests cover each of these cases?",
      "If each segment's endpoints lie on opposite sides of the other segment's line, the segments cross. Check this with the signs of cross products.",
      "Also handle the case where an endpoint lies exactly on the other segment: the cross product is zero and the point lies inside the segment's bounding box.",
      "Touching at an endpoint counts as an intersection, so the boundary checks must include equality.",
    ],
    solution: {
      idea: [
        "Compute the orientation (sign of cross product) of points relative to each segment.",
        "General intersection occurs when endpoints of each segment lie on opposite sides of the line defined by the other segment.",
        "Collinear touching or overlap is verified by testing whether any endpoint lies on the other segment's bounding box."
      ],
      complexity: "O(1) time per query, O(1) auxiliary space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
    struct Point {
        long long x, y;
    };
    int sign(long long v) {
        if (v > 0) return 1;
        if (v < 0) return -1;
        return 0;
    }
    int cross(const Point& a, const Point& b, const Point& c) {
        long long cp = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
        return sign(cp);
    }
    bool onSegment(const Point& a, const Point& b, const Point& p) {
        return p.x >= min(a.x, b.x) && p.x <= max(a.x, b.x) &&
               p.y >= min(a.y, b.y) && p.y <= max(a.y, b.y);
    }
public:
    vector<string> lineSegmentIntersection(vector<vector<int>>& queries) {
        vector<string> ans;
        ans.reserve(queries.size());
        for (const auto& q : queries) {
            Point p1{q[0], q[1]}, p2{q[2], q[3]};
            Point p3{q[4], q[5]}, p4{q[6], q[7]};
            int o1 = cross(p1, p2, p3);
            int o2 = cross(p1, p2, p4);
            int o3 = cross(p3, p4, p1);
            int o4 = cross(p3, p4, p2);

            if (o1 != o2 && o3 != o4) {
                ans.push_back("YES");
            } else if (o1 == 0 && onSegment(p1, p2, p3)) {
                ans.push_back("YES");
            } else if (o2 == 0 && onSegment(p1, p2, p4)) {
                ans.push_back("YES");
            } else if (o3 == 0 && onSegment(p3, p4, p1)) {
                ans.push_back("YES");
            } else if (o4 == 0 && onSegment(p3, p4, p2)) {
                ans.push_back("YES");
            } else {
                ans.push_back("NO");
            }
        }
        return ans;
    }
};
`
    }
  },
  {
    id: "cses-polygon-area",
    source: "cses",
    title: "Polygon Area",
    url: "https://cses.fi/problemset/task/2191",
    statement: [
      "Given the coordinates of a polygon with n vertices in consecutive order (either clockwise or counter-clockwise), calculate its area.",
      "Since the area of a polygon with integer coordinates is always an integer or half-integer, return 2 * Area (the double area), which is always an exact integer."
    ],
    constraints: [
      "3 <= points.length <= 1000",
      "-10^9 <= x, y <= 10^9 for each point [x, y]"
    ],
    fn: {
      name: "polygonArea",
      params: [{ name: "points", type: "int[][]" }],
      returns: "long"
    },
    examples: [
      {
        input: [[[2, 5], [5, 4], [4, 1], [1, 2]]],
        output: 20,
        explanation: "By the shoelace formula, the double area is 20 (actual area is 10)."
      },
      {
        input: [[[0, 0], [4, 0], [0, 3]]],
        output: 12,
        explanation: "Right triangle with base 4 and height 3 has area 6; double area is 12."
      }
    ],
    tests: [
      {
        input: [[[0, 0], [1, 0], [1, 1], [0, 1]]],
        output: 2
      },
      {
        input: [[[0, 0], [0, 3], [4, 0]]],
        output: 12
      },
      {
        input: [[[0, 0], [5, 0], [5, 3], [2, 5], [0, 3]]],
        output: 40
      },
      {
        input: [[[1, 0], [2, 0], [3, 1], [2, 2], [1, 2], [0, 1]]],
        output: 8
      },
      {
        input: [[[0, 0], [1000000000, 0], [1000000000, 1000000000], [0, 1000000000]]],
        output: 2000000000000000000
      },
      {
        input: [[[0, 0], [2, 0], [2, 2], [0, 2]]],
        output: 8
      }
    ],
    hints: [
      "The polygon's area can be split into signed triangles, one per edge, measured from the origin. What does each edge contribute?",
      "Each edge adds a cross-product term built from its two endpoints. The sum of these terms is twice the signed area.",
      "Loop over the vertices once, wrapping the last one back to the first, and accumulate the cross terms in a 64-bit integer.",
      "Return the absolute value of the total, because the vertices can be listed clockwise or counterclockwise.",
    ],
    solution: {
      idea: [
        "Apply the shoelace formula by iterating through vertices in cyclic order.",
        "Add xi * y_{i+1} - x_{i+1} * yi to a 64-bit sum, and return abs(sum)."
      ],
      complexity: "O(n) time, O(1) auxiliary space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    long long polygonArea(vector<vector<int>>& points) {
        int n = points.size();
        long long sum = 0;
        for (int i = 0; i < n; i++) {
            int j = (i + 1) % n;
            long long xi = points[i][0], yi = points[i][1];
            long long xj = points[j][0], yj = points[j][1];
            sum += xi * yj - xj * yi;
        }
        return abs(sum);
    }
};
`
    }
  },
  {
    id: "cses-point-in-polygon",
    source: "cses",
    title: "Point in Polygon",
    url: "https://cses.fi/problemset/task/2192",
    statement: [
      "You are given a polygon of n vertices and a list of m query points.",
      "For each point, determine if it lies strictly INSIDE, strictly OUTSIDE, or on the BOUNDARY of the polygon.",
      "Return an array of strings corresponding to each point in order: 'INSIDE', 'OUTSIDE', or 'BOUNDARY'."
    ],
    constraints: [
      "3 <= polygon.length <= 1000",
      "1 <= points.length <= 1000",
      "-10^9 <= x, y <= 10^9 for all coordinates"
    ],
    fn: {
      name: "pointInPolygon",
      params: [{ name: "polygon", type: "int[][]" }, { name: "points", type: "int[][]" }],
      returns: "string[]"
    },
    examples: [
      {
        input: [[[1, 1], [4, 2], [3, 5], [1, 4]], [[2, 3], [3, 1], [1, 3]]],
        output: ["INSIDE", "OUTSIDE", "BOUNDARY"],
        explanation: "(2, 3) is strictly interior, (3, 1) is exterior, and (1, 3) lies on the segment between (1, 1) and (1, 4)."
      }
    ],
    tests: [
      {
        input: [[[1, 1], [4, 2], [3, 5], [1, 4]], [[1, 1]]],
        output: ["BOUNDARY"]
      },
      {
        input: [[[0, 0], [6, 0], [0, 6]], [[2, 2], [3, 3], [5, 5], [0, 3], [3, 0], [-1, 1]]],
        output: ["INSIDE", "BOUNDARY", "OUTSIDE", "BOUNDARY", "BOUNDARY", "OUTSIDE"]
      },
      {
        input: [[[0, 0], [4, 0], [4, 4], [0, 4]], [[2, 2], [0, 2], [4, 2], [2, 0], [2, 4], [5, 5]]],
        output: ["INSIDE", "BOUNDARY", "BOUNDARY", "BOUNDARY", "BOUNDARY", "OUTSIDE"]
      },
      {
        input: [[[0, 0], [4, 0], [4, 4], [0, 4]], [[-2, -2]]],
        output: ["OUTSIDE"]
      },
      {
        input: [[[0, 0], [4, 0], [4, 4], [0, 4]], [[0, 0]]],
        output: ["BOUNDARY"]
      },
      {
        input: [[[0, 0], [4, 0], [4, 4], [0, 4]], [[1, 1]]],
        output: ["INSIDE"]
      }
    ],
    hints: [
      "Before counting anything, decide whether the point lies on an edge. How would a cross product and a box test check that?",
      "If the point is not on the border, shoot a ray from it and count how many edges it crosses. An odd count means inside, and an even count means outside.",
      "Use a half-open rule on the y coordinates so that a vertex shared by two edges is counted once, and decide each crossing with the sign of a cross product.",
      "Use exact integer arithmetic for the crossing test rather than dividing, so the result is never affected by rounding.",
    ],
    solution: {
      idea: [
        "First check if the point lies on any boundary segment.",
        "Otherwise, cast a horizontal ray extending to the right (+infinity) and count how many polygon edges it intersects.",
        "By the Jordan curve theorem, an odd number of crossings indicates the point is INSIDE, and an even number indicates OUTSIDE."
      ],
      complexity: "O(n * m) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
    struct Point {
        long long x, y;
    };
    bool onSegment(Point a, Point b, Point p) {
        long long cp = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
        if (cp != 0) return false;
        return p.x >= min(a.x, b.x) && p.x <= max(a.x, b.x) &&
               p.y >= min(a.y, b.y) && p.y <= max(a.y, b.y);
    }
public:
    vector<string> pointInPolygon(vector<vector<int>>& polygon, vector<vector<int>>& points) {
        int n = polygon.size();
        vector<Point> poly(n);
        for (int i = 0; i < n; i++) {
            poly[i] = {polygon[i][0], polygon[i][1]};
        }
        vector<string> ans;
        ans.reserve(points.size());

        for (const auto& pt : points) {
            Point p{pt[0], pt[1]};
            bool boundary = false;
            int crossings = 0;

            for (int i = 0; i < n; i++) {
                Point a = poly[i];
                Point b = poly[(i + 1) % n];

                if (onSegment(a, b, p)) {
                    boundary = true;
                    break;
                }

                if (a.y > b.y) swap(a, b);
                if (a.y <= p.y && p.y < b.y) {
                    long long cp = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
                    if (cp > 0) {
                        crossings++;
                    }
                }
            }

            if (boundary) {
                ans.push_back("BOUNDARY");
            } else if (crossings % 2 == 1) {
                ans.push_back("INSIDE");
            } else {
                ans.push_back("OUTSIDE");
            }
        }
        return ans;
    }
};
`
    }
  },
  {
    id: "cses-polygon-lattice-points",
    source: "cses",
    title: "Polygon Lattice Points",
    url: "https://cses.fi/problemset/task/2193",
    statement: [
      "Given a polygon with n vertices with integer coordinates, find the number of lattice points (points with integer coordinates) strictly inside the polygon and on its boundary.",
      "Return an array [inside, boundary] where inside is the number of points strictly inside and boundary is the number of points on the boundary."
    ],
    constraints: [
      "3 <= polygon.length <= 100000",
      "-10^9 <= x, y <= 10^9"
    ],
    fn: {
      name: "polygonLatticePoints",
      params: [{ name: "polygon", type: "int[][]" }],
      returns: "long[]"
    },
    examples: [
      {
        input: [[[2, 3], [6, 9], [10, 5], [8, 1]]],
        output: [30, 10],
        explanation: "The polygon has 10 integer lattice points on its edges and 30 strictly interior points."
      },
      {
        input: [[[0, 0], [4, 0], [0, 3]]],
        output: [3, 8],
        explanation: "Right triangle with edges of length 4, 3, and 5 has boundary points gcd(4,0)+gcd(4,3)+gcd(0,3) = 4 + 1 + 3 = 8; inside points = 3."
      }
    ],
    tests: [
      {
        input: [[[0, 0], [1, 0], [1, 1], [0, 1]]],
        output: [0, 4]
      },
      {
        input: [[[0, 0], [2, 0], [2, 2], [0, 2]]],
        output: [1, 8]
      },
      {
        input: [[[0, 0], [3, 0], [3, 3], [0, 3]]],
        output: [4, 12]
      },
      {
        input: [[[0, 0], [5, 0], [5, 5], [0, 5]]],
        output: [16, 20]
      },
      {
        input: [[[0, 0], [5, 0], [7, 3], [2, 3]]],
        output: [10, 12]
      },
      {
        input: [[[0, 0], [1, 0], [1, 2], [0, 2]]],
        output: [0, 6]
      }
    ],
    hints: [
      "Counting lattice points inside a polygon directly is hard. Is there a formula that relates the area and the boundary points to the interior points?",
      "Pick's theorem links the doubled area, the number of boundary points and the number of interior points. If you know two of them, the third follows.",
      "For the boundary, each edge contributes the gcd of its coordinate differences. The shoelace formula gives the doubled area, and then you can solve for the interior count.",
      "Keep the doubled area as an integer and do the subtraction before dividing by 2.",
    ],
    solution: {
      idea: [
        "Calculate the double area 2A using the shoelace formula.",
        "Sum gcd(|x_{i+1} - x_i|, |y_{i+1} - y_i|) across all edges to find the total boundary points B.",
        "By Pick's theorem, I = (2A - B + 2) / 2."
      ],
      complexity: "O(n log(max_coord)) time, O(1) auxiliary space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
    long long gcd(long long a, long long b) {
        while (b) {
            a %= b;
            swap(a, b);
        }
        return a;
    }
public:
    vector<long long> polygonLatticePoints(vector<vector<int>>& polygon) {
        int n = polygon.size();
        long long doubleArea = 0;
        long long boundary = 0;
        for (int i = 0; i < n; i++) {
            int j = (i + 1) % n;
            long long xi = polygon[i][0], yi = polygon[i][1];
            long long xj = polygon[j][0], yj = polygon[j][1];
            doubleArea += xi * yj - xj * yi;
            boundary += gcd(abs(xj - xi), abs(yj - yi));
        }
        doubleArea = abs(doubleArea);
        long long inside = (doubleArea - boundary + 2) / 2;
        return {inside, boundary};
    }
};
`
    }
  },
  {
    id: "cses-minimum-euclidean-distance",
    source: "cses",
    title: "Minimum Euclidean Distance",
    url: "https://cses.fi/problemset/task/2194",
    statement: [
      "Given n points in the two-dimensional plane, calculate the minimum squared Euclidean distance between two distinct points.",
      "The squared Euclidean distance between (x1, y1) and (x2, y2) is (x1 - x2)^2 + (y1 - y2)^2.",
      "Return this minimum value as a 64-bit integer."
    ],
    constraints: [
      "2 <= points.length <= 200000",
      "-10^9 <= x, y <= 10^9 for each point [x, y]"
    ],
    fn: {
      name: "minimumEuclideanDistance",
      params: [{ name: "points", type: "int[][]" }],
      returns: "long"
    },
    examples: [
      {
        input: [[[2, 1], [4, 4], [1, 2], [6, 3]]],
        output: 2,
        explanation: "Points (2, 1) and (1, 2) have squared distance (2 - 1)^2 + (1 - 2)^2 = 1 + 1 = 2."
      },
      {
        input: [[[0, 0], [3, 4]]],
        output: 25,
        explanation: "Squared distance is 3^2 + 4^2 = 25."
      }
    ],
    tests: [
      {
        input: [[[1, 2], [5, 5], [1, 2]]],
        output: 0
      },
      {
        input: [[[0, 0], [5, 0], [12, 0]]],
        output: 25
      },
      {
        input: [[[-10, -10], [-7, -6], [20, 20]]],
        output: 25
      },
      {
        input: [[[0, 0], [10, 0], [10, 10], [0, 10]]],
        output: 100
      },
      {
        input: [[[1000000000, 1000000000], [1000000001, 1000000001]]],
        output: 2
      },
      {
        input: [[[1, 1], [4, 5]]],
        output: 25
      }
    ],
    hints: [
      "Checking all pairs is too slow. If you sort the points by x, which pairs can possibly be the closest?",
      "Once you have a best squared distance d, a point more than sqrt(d) away in x cannot beat it, so only points close in x matter.",
      "Sweep in x order and keep the active points ordered by y. For each new point, check only the active points whose y lies within sqrt(d) of its y.",
      "The candidate box holds only a few points, so the sweep stays fast. Use squared distances in 64-bit integers to avoid floating-point errors.",
    ],
    solution: {
      idea: [
        "Sort points primarily by x-coordinate.",
        "Maintain an active set of points ordered by y-coordinate within a sliding window of width sqrt(d).",
        "For each point, query the y-interval [py - ceil(sqrt(d)), py + ceil(sqrt(d))] in the active set and update d with the minimum squared distance.",
        "Add the current point to the active set."
      ],
      complexity: "O(n log n) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
    struct Point {
        long long x, y;
    };
public:
    long long minimumEuclideanDistance(vector<vector<int>>& points) {
        int n = points.size();
        vector<Point> pts(n);
        for (int i = 0; i < n; i++) {
            pts[i] = {points[i][0], points[i][1]};
        }
        sort(pts.begin(), pts.end(), [](const Point& a, const Point& b) {
            if (a.x != b.x) return a.x < b.x;
            return a.y < b.y;
        });

        for (int i = 0; i < n - 1; i++) {
            if (pts[i].x == pts[i + 1].x && pts[i].y == pts[i + 1].y) return 0;
        }

        auto distSq = [](const Point& a, const Point& b) -> long long {
            long long dx = a.x - b.x;
            long long dy = a.y - b.y;
            return dx * dx + dy * dy;
        };

        long long d = distSq(pts[0], pts[1]);
        auto cmpY = [](const Point& a, const Point& b) {
            if (a.y != b.y) return a.y < b.y;
            return a.x < b.x;
        };
        set<Point, decltype(cmpY)> active(cmpY);

        int left = 0;
        for (int i = 0; i < n; i++) {
            long long limitX = ceil(sqrt((double)d));
            while (left < i && pts[i].x - pts[left].x >= limitX) {
                active.erase(pts[left]);
                left++;
            }

            long long limitY = ceil(sqrt((double)d));
            Point lowerPt{pts[i].x, pts[i].y - limitY};

            auto itLow = active.lower_bound(lowerPt);
            for (auto it = itLow; it != active.end() && it->y <= pts[i].y + limitY; ++it) {
                d = min(d, distSq(pts[i], *it));
            }

            active.insert(pts[i]);
        }

        return d;
    }
};
`
    }
  },
  {
    id: "cses-convex-hull",
    source: "cses",
    title: "Convex Hull",
    url: "https://cses.fi/problemset/task/2195",
    unordered: true,
    statement: [
      "Given a set of n points in the two-dimensional plane, find all points that lie on the convex hull.",
      "All points on the boundary of the convex hull must be included in the output, even if multiple points are collinear.",
      "Return the vertices of the convex hull as a 2D array of coordinates. Any order of the hull points is accepted."
    ],
    constraints: [
      "3 <= points.length <= 200000",
      "-10^9 <= x, y <= 10^9 for each point [x, y]",
      "All points are distinct"
    ],
    fn: {
      name: "convexHull",
      params: [{ name: "points", type: "int[][]" }],
      returns: "int[][]"
    },
    examples: [
      {
        input: [[[2, 1], [2, 5], [3, 3], [4, 3], [4, 4], [1, 3]]],
        output: [[1, 3], [2, 1], [4, 3], [4, 4], [2, 5]],
        explanation: "Point (3, 3) is strictly interior; all other 5 points lie on the convex hull boundary."
      }
    ],
    tests: [
      {
        input: [[[0, 0], [6, 0], [0, 6], [2, 2]]],
        output: [[0, 0], [6, 0], [0, 6]]
      },
      {
        input: [[[0, 0], [1, 0], [2, 0], [2, 2], [0, 2]]],
        output: [[0, 0], [1, 0], [2, 0], [2, 2], [0, 2]]
      },
      {
        input: [[[0, 0], [1, 1], [2, 2]]],
        output: [[0, 0], [1, 1], [2, 2]]
      },
      {
        input: [[[0, 2], [2, 4], [4, 2], [2, 0], [2, 2]]],
        output: [[0, 2], [2, 4], [4, 2], [2, 0]]
      },
      {
        input: [[[0, 0], [1, 0], [1, 1], [0, 1]]],
        output: [[0, 0], [0, 1], [1, 0], [1, 1]]
      },
      {
        input: [[[0, 0], [2, 0], [0, 2]]],
        output: [[0, 0], [0, 2], [2, 0]]
      }
    ],
    hints: [
      "The hull is the outer boundary of the points. Could you build it by processing the points in a fixed order and watching the turns?",
      "Sort the points by x, then y. Build the lower chain from left to right and the upper chain from right to left, keeping only turns that do not go clockwise.",
      "Monotone chain: while the last turn is clockwise, pop the last point. Keeping collinear points means popping only on a strict clockwise turn. Join the two chains and drop the repeated endpoints.",
      "Handle the case where all points lie on one line, and remove duplicate input points before building the hull.",
    ],
    solution: {
      idea: [
        "Sort points by x, then y.",
        "Build the lower hull by adding points from left to right, maintaining non-clockwise turns (cross >= 0) to preserve collinear points on edges.",
        "Build the upper hull similarly from right to left.",
        "Concatenate both hulls and eliminate duplicate endpoints."
      ],
      complexity: "O(n log n) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
    struct Point {
        long long x, y;
    };
    static long long cross(const Point& o, const Point& a, const Point& b) {
        return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    }
public:
    vector<vector<int>> convexHull(vector<vector<int>>& points) {
        int n = points.size();
        if (n <= 2) return points;

        vector<Point> pts(n);
        for (int i = 0; i < n; i++) pts[i] = {points[i][0], points[i][1]};
        sort(pts.begin(), pts.end(), [](const Point& a, const Point& b) {
            if (a.x != b.x) return a.x < b.x;
            return a.y < b.y;
        });

        // Lower hull
        vector<Point> lower;
        for (int i = 0; i < n; i++) {
            while (lower.size() >= 2 && cross(lower[lower.size() - 2], lower.back(), pts[i]) < 0) {
                lower.pop_back();
            }
            lower.push_back(pts[i]);
        }

        // Upper hull
        vector<Point> upper;
        for (int i = n - 1; i >= 0; i--) {
            while (upper.size() >= 2 && cross(upper[upper.size() - 2], upper.back(), pts[i]) < 0) {
                upper.pop_back();
            }
            upper.push_back(pts[i]);
        }

        vector<Point> combined = lower;
        combined.insert(combined.end(), upper.begin(), upper.end());

        // Sort and remove duplicates
        sort(combined.begin(), combined.end(), [](const Point& a, const Point& b) {
            if (a.x != b.x) return a.x < b.x;
            return a.y < b.y;
        });
        combined.erase(unique(combined.begin(), combined.end(), [](const Point& a, const Point& b) {
            return a.x == b.x && a.y == b.y;
        }), combined.end());

        vector<vector<int>> res;
        res.reserve(combined.size());
        for (const auto& p : combined) {
            res.push_back({(int)p.x, (int)p.y});
        }
        return res;
    }
};
`
    }
  },

  // ==========================================
  // Strings
  // ==========================================
  {
    id: "cses-word-combinations",
    source: "cses",
    title: "Word Combinations",
    url: "https://cses.fi/problemset/task/1731",
    statement: [
      "You are given a target string of length n and a dictionary of k words.",
      "Count the number of ways to form the target string by concatenating words from the dictionary. Each word may be used multiple times.",
      "Since the result can be very large, return it modulo 10^9 + 7."
    ],
    constraints: [
      "1 <= s.length <= 5000",
      "1 <= words.length <= 100000",
      "Total length of words in words <= 1000000",
      "All characters in s and words are lowercase English letters"
    ],
    fn: {
      name: "wordCombinations",
      params: [{ name: "s", type: "string" }, { name: "words", type: "string[]" }],
      returns: "int"
    },
    examples: [
      {
        input: ["abacaba", ["abac", "aba", "caba"]],
        output: 2,
        explanation: "The two valid combinations are 'abac' + 'aba' and 'aba' + 'caba'."
      },
      {
        input: ["a", ["a"]],
        output: 1,
        explanation: "Only the single word 'a' matches."
      }
    ],
    tests: [
      {
        input: ["abc", ["ab", "d"]],
        output: 0
      },
      {
        input: ["aaaa", ["a"]],
        output: 1
      },
      {
        input: ["aaaa", ["a", "aa"]],
        output: 5
      },
      {
        input: ["banana", ["ba", "na", "an", "ban", "ana"]],
        output: 2
      },
      {
        input: ["hello", ["he", "ll", "o", "hello"]],
        output: 2
      },
      {
        input: ["xyz", ["x", "y", "z"]],
        output: 1
      }
    ],
    hints: [
      "Let dp[i] be the number of ways to build the first i letters of the target. From each position, which dictionary words could start there?",
      "From every position with a nonzero count, each dictionary word that matches the text there adds its count to the position just after that word.",
      "Store the dictionary in a prefix tree. From each position, walk down the tree along the text, and add the count whenever a word ends.",
      "Stop walking as soon as the tree has no matching branch, and take all counts modulo the prime.",
    ],
    solution: {
      idea: [
        "Build a Trie from all words in the dictionary.",
        "Initialize dp array of size n + 1 with dp[0] = 1.",
        "For each position i from 0 to n - 1 with dp[i] > 0, traverse the Trie matching characters of s starting at index i.",
        "Whenever a word endpoint is encountered at index j, update dp[j + 1] = (dp[j + 1] + dp[i]) % MOD."
      ],
      complexity: "O(total_words_len + n * min(n, max_word_len)) time, O(total_words_len) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
    struct Node {
        int next[26];
        bool isEnd = false;
        Node() {
            memset(next, 0, sizeof(next));
        }
    };
public:
    int wordCombinations(string s, vector<string>& words) {
        vector<Node> trie;
        trie.emplace_back();

        for (const string& w : words) {
            int cur = 0;
            for (char c : w) {
                int idx = c - 'a';
                if (!trie[cur].next[idx]) {
                    trie[cur].next[idx] = trie.size();
                    trie.emplace_back();
                }
                cur = trie[cur].next[idx];
            }
            trie[cur].isEnd = true;
        }

        int n = s.size();
        const int MOD = 1000000007;
        vector<int> dp(n + 1, 0);
        dp[0] = 1;

        for (int i = 0; i < n; i++) {
            if (dp[i] == 0) continue;
            int cur = 0;
            for (int j = i; j < n; j++) {
                int idx = s[j] - 'a';
                if (!trie[cur].next[idx]) break;
                cur = trie[cur].next[idx];
                if (trie[cur].isEnd) {
                    dp[j + 1] = (dp[j + 1] + dp[i]) % MOD;
                }
            }
        }

        return dp[n];
    }
};
`
    }
  },
  {
    id: "cses-finding-borders",
    source: "cses",
    title: "Finding Borders",
    url: "https://cses.fi/problemset/task/1732",
    statement: [
      "A border of a string is a substring that is both a proper prefix and a proper suffix.",
      "Given a string s of length n, find all border lengths of s in increasing order."
    ],
    constraints: [
      "1 <= s.length <= 1000000",
      "s consists only of lowercase English letters"
    ],
    fn: {
      name: "findingBorders",
      params: [{ name: "s", type: "string" }],
      returns: "int[]"
    },
    examples: [
      {
        input: ["abacaba"],
        output: [1, 3],
        explanation: "Border of length 1 is 'a', and border of length 3 is 'aba'."
      },
      {
        input: ["aaaa"],
        output: [1, 2, 3],
        explanation: "Borders of 'aaaa' have lengths 1 ('a'), 2 ('aa'), and 3 ('aaa')."
      }
    ],
    tests: [
      {
        input: ["abcde"],
        output: []
      },
      {
        input: ["a"],
        output: []
      },
      {
        input: ["ababab"],
        output: [2, 4]
      },
      {
        input: ["abacababacaba"],
        output: [1, 3, 7]
      },
      {
        input: ["aabaa"],
        output: [1, 2]
      },
      {
        input: ["abcabc"],
        output: [3]
      }
    ],
    hints: [
      "A border is a prefix that is also a suffix. What is the longest such prefix for the whole string, and how can you find the shorter ones?",
      "The longest border can be read from the prefix-function table. Every shorter border is itself a border of the longest one.",
      "Build the prefix-function table with KMP. Then follow the chain starting from the last value, each step using the table entry at the previous length.",
      "The chain gives lengths from longest to shortest, so reverse them before printing.",
    ],
    solution: {
      idea: [
        "Compute the KMP failure function pi of length n for string s.",
        "Follow the chain of lengths starting at k = pi[n - 1], transitioning to k = pi[k - 1] until k = 0.",
        "Reverse the gathered lengths so they are sorted in increasing order."
      ],
      complexity: "O(n) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> findingBorders(string s) {
        int n = s.size();
        if (n <= 1) return {};

        vector<int> pi(n, 0);
        for (int i = 1; i < n; i++) {
            int j = pi[i - 1];
            while (j > 0 && s[i] != s[j]) j = pi[j - 1];
            if (s[i] == s[j]) j++;
            pi[i] = j;
        }

        vector<int> borders;
        int k = pi[n - 1];
        while (k > 0) {
            borders.push_back(k);
            k = pi[k - 1];
        }

        reverse(borders.begin(), borders.end());
        return borders;
    }
};
`
    }
  },
  {
    id: "cses-finding-periods",
    source: "cses",
    title: "Finding Periods",
    url: "https://cses.fi/problemset/task/1733",
    statement: [
      "A period of a string s of length n is an integer p (1 <= p <= n) such that s[i] == s[i + p] for all 0 <= i < n - p.",
      "Your task is to find all period lengths of s in increasing order (note that n is always a period)."
    ],
    constraints: [
      "1 <= s.length <= 1000000",
      "s consists only of lowercase English letters"
    ],
    fn: {
      name: "findingPeriods",
      params: [{ name: "s", type: "string" }],
      returns: "int[]"
    },
    examples: [
      {
        input: ["abacaba"],
        output: [4, 6, 7],
        explanation: "p = 4 repeats 'abac', p = 6 matches s[0] == s[6], and p = 7 is the entire string length."
      },
      {
        input: ["aaaa"],
        output: [1, 2, 3, 4],
        explanation: "Every length from 1 to 4 is a period for all identical characters."
      }
    ],
    tests: [
      {
        input: ["abcde"],
        output: [5]
      },
      {
        input: ["abab"],
        output: [2, 4]
      },
      {
        input: ["abcabc"],
        output: [3, 6]
      },
      {
        input: ["aabaa"],
        output: [3, 4, 5]
      },
      {
        input: ["a"],
        output: [1]
      },
      {
        input: ["aaaa"],
        output: [1, 2, 3, 4]
      }
    ],
    hints: [
      "A period p means the string matches itself when shifted by p. Which comparison between a prefix and a suffix shows that?",
      "The shift p works exactly when the suffix starting at position p matches a prefix of the same length. The Z-array stores that matching length for every position.",
      "Build the Z-array in linear time. Then p is a period when its Z value reaches the remaining length, n minus p.",
      "Output the periods in increasing order, and remember that n itself is always a period.",
    ],
    solution: {
      idea: [
        "Compute the Z-algorithm array z of string s in O(n) time.",
        "For each p from 1 to n - 1, check if z[p] >= n - p; if so, p is a valid period.",
        "Always append n as the trivial full-length period."
      ],
      complexity: "O(n) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> findingPeriods(string s) {
        int n = s.size();
        vector<int> z(n, 0);
        int l = 0, r = 0;
        for (int i = 1; i < n; i++) {
            if (i <= r) z[i] = min(r - i + 1, z[i - l]);
            while (i + z[i] < n && s[z[i]] == s[i + z[i]]) z[i]++;
            if (i + z[i] - 1 > r) {
                l = i;
                r = i + z[i] - 1;
            }
        }

        vector<int> periods;
        for (int p = 1; p < n; p++) {
            if (z[p] >= n - p) {
                periods.push_back(p);
            }
        }
        periods.push_back(n);
        return periods;
    }
};
`
    }
  },
  {
    id: "cses-minimal-rotation",
    source: "cses",
    title: "Minimal Rotation",
    url: "https://cses.fi/problemset/task/1110",
    statement: [
      "A rotation of a string can be generated by moving characters one by one from the beginning to the end.",
      "Your task is to find the lexicographically minimal rotation of a string s."
    ],
    constraints: [
      "1 <= s.length <= 1000000",
      "s consists only of lowercase English letters"
    ],
    fn: {
      name: "minimalRotation",
      params: [{ name: "s", type: "string" }],
      returns: "string"
    },
    examples: [
      {
        input: ["acabaca"],
        output: "aacabac",
        explanation: "Rotating 'acabaca' starting at index 5 gives 'aacabac', which is lexicographically smallest."
      },
      {
        input: ["ba"],
        output: "ab",
        explanation: "The two rotations are 'ba' and 'ab'; 'ab' is minimal."
      }
    ],
    tests: [
      {
        input: ["aaaa"],
        output: "aaaa"
      },
      {
        input: ["cba"],
        output: "acb"
      },
      {
        input: ["bba"],
        output: "abb"
      },
      {
        input: ["bcdeea"],
        output: "abcdee"
      },
      {
        input: ["abab"],
        output: "abab"
      },
      {
        input: ["z"],
        output: "z"
      }
    ],
    hints: [
      "Writing out every rotation and comparing them is too slow. Could you treat the rotations as substrings of a doubled string?",
      "Doubling the string turns each rotation into a window of length n. You need the window that is smallest in dictionary order.",
      "Use Booth's algorithm, a KMP-style scan over the doubled string that keeps the best start index and skips starts that cannot win.",
      "Return the substring of length n that begins at the best index.",
    ],
    solution: {
      idea: [
        "Concatenate string s with itself to form S = s + s.",
        "Apply Booth's algorithm, maintaining a failure function f over S to track candidate starting positions.",
        "Extract the substring of length n starting at the computed index k in O(n) total time."
      ],
      complexity: "O(n) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    string minimalRotation(string s) {
        int n = s.size();
        string S = s + s;
        vector<int> f(2 * n, -1);
        int k = 0;
        for (int j = 1; j < 2 * n; j++) {
            char sj = S[j];
            int i = f[j - k - 1];
            while (i != -1 && sj != S[k + i + 1]) {
                if (sj < S[k + i + 1]) k = j - i - 1;
                i = f[i];
            }
            if (sj != S[k + i + 1]) {
                if (sj < S[k]) k = j;
                f[j - k] = -1;
            } else {
                f[j - k] = i + 1;
            }
        }
        return S.substr(k, n);
    }
};
`
    }
  },
  {
    id: "cses-longest-palindrome",
    source: "cses",
    title: "Longest Palindrome",
    url: "https://cses.fi/problemset/task/1111",
    statement: [
      "Given a string s, find a longest palindrome that is a substring of s.",
      "If there are multiple palindromic substrings of the maximum length, any of them is accepted."
    ],
    constraints: [
      "1 <= s.length <= 1000000",
      "s consists only of lowercase English letters"
    ],
    fn: {
      name: "longestPalindrome",
      params: [{ name: "s", type: "string" }],
      returns: "string"
    },
    examples: [
      {
        input: ["aybabtu"],
        output: "bab",
        explanation: "'bab' is the longest palindromic substring."
      },
      {
        input: ["racecar"],
        output: "racecar",
        explanation: "The entire string is a palindrome."
      }
    ],
    tests: [
      {
        input: ["x"],
        output: "x"
      },
      {
        input: ["aa"],
        output: "aa"
      },
      {
        input: ["abccba"],
        output: "abccba"
      },
      {
        input: ["banana"],
        output: "anana"
      },
      {
        input: ["noonbreak"],
        output: "noon"
      },
      {
        input: ["abcba"],
        output: "abcba"
      }
    ],
    hints: [
      "Expanding around each center is simple, but it can repeat work. Could you reuse what you already know about palindromes you have found?",
      "Mirror symmetry: inside a palindrome, the palindrome radius at a position is at least the radius at its mirror position, capped by the palindrome's edge.",
      "Use Manacher's algorithm on the string with separators between characters, so odd and even palindromes are handled the same way. Keep track of the rightmost palindrome seen so far.",
      "Map the best center back to the original string. Its radius equals the length of the original palindrome.",
    ],
    solution: {
      idea: [
        "Transform string s into t by sandwiching characters between '#' with bounding sentinel characters '^' and '$'.",
        "Run Manacher's algorithm maintaining the current palindrome center c and right boundary r.",
        "Track the maximum radius and its center index, then map back to the original string coordinates."
      ],
      complexity: "O(n) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    string longestPalindrome(string s) {
        if (s.empty()) return "";
        string t = "^";
        for (char c : s) {
            t += '#';
            t += c;
        }
        t += "#$";

        int m = t.size();
        vector<int> p(m, 0);
        int c = 0, r = 0;
        int maxLen = 0, centerIndex = 0;

        for (int i = 1; i < m - 1; i++) {
            int iMirror = 2 * c - i;
            if (r > i) p[i] = min(r - i, p[iMirror]);
            while (t[i + 1 + p[i]] == t[i - 1 - p[i]]) p[i]++;
            if (i + p[i] > r) {
                c = i;
                r = i + p[i];
            }
            if (p[i] > maxLen) {
                maxLen = p[i];
                centerIndex = i;
            }
        }

        int start = (centerIndex - maxLen) / 2;
        return s.substr(start, maxLen);
    }
};
`
    }
  },
  {
    id: "cses-required-substring",
    source: "cses",
    title: "Required Substring",
    url: "https://cses.fi/problemset/task/1112",
    statement: [
      "Calculate the number of strings of length n consisting of uppercase English letters (A-Z) that contain a given pattern of length m as a substring.",
      "Since the result can be very large, return it modulo 10^9 + 7."
    ],
    constraints: [
      "1 <= n <= 1000",
      "1 <= pattern.length <= 100",
      "pattern.length <= n",
      "pattern consists of uppercase English letters (A-Z)"
    ],
    fn: {
      name: "requiredSubstring",
      params: [{ name: "n", type: "int" }, { name: "pattern", type: "string" }],
      returns: "int"
    },
    examples: [
      {
        input: [2, "A"],
        output: 51,
        explanation: "Total strings of length 2 is 26^2 = 676. Those without 'A' is 25^2 = 625. Containing 'A' = 676 - 625 = 51."
      },
      {
        input: [3, "AB"],
        output: 52,
        explanation: "Strings with 'AB' at position 0 ('AB_') are 26, and at position 1 ('_AB') are 26, with 0 overlap."
      }
    ],
    tests: [
      {
        input: [2, "AB"],
        output: 1
      },
      {
        input: [1, "Z"],
        output: 1
      },
      {
        input: [4, "ABC"],
        output: 52
      },
      {
        input: [4, "ABA"],
        output: 52
      },
      {
        input: [3, "A"],
        output: 1951
      },
      {
        input: [3, "XYZ"],
        output: 1
      }
    ],
    hints: [
      "Counting strings that contain a pattern is tricky. Is there a related count that is easier, and how would you get the answer from it?",
      "Count the strings that never contain the pattern, then subtract that from the total number of strings. Track how much of the pattern has been matched so far.",
      "Build a KMP automaton whose states are the matched prefix lengths, leaving out the state where the full pattern is matched. Run a DP over the string length and the state.",
      "The total is 26 to the power n. Subtract the forbidden count from it and reduce modulo the prime.",
    ],
    solution: {
      idea: [
        "Construct the KMP transition automaton for pattern of length m over alphabet size 26.",
        "Define dp[state] as the number of strings avoiding the pattern ending at KMP state (0 <= state < m).",
        "Transition for each character 'A'..'Z': if the next state is < m, advance dp[next_state].",
        "Subtract the total non-matching strings from 26^n modulo 10^9 + 7."
      ],
      complexity: "O(26 * m + 26 * n * m) time, O(m) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int requiredSubstring(int n, string pattern) {
        int m = pattern.size();
        const int MOD = 1000000007;

        vector<int> pi(m, 0);
        for (int i = 1; i < m; i++) {
            int j = pi[i - 1];
            while (j > 0 && pattern[i] != pattern[j]) j = pi[j - 1];
            if (pattern[i] == pattern[j]) j++;
            pi[i] = j;
        }

        vector<vector<int>> aut(m, vector<int>(26, 0));
        for (int state = 0; state < m; state++) {
            for (int c = 0; c < 26; c++) {
                char ch = 'A' + c;
                int j = state;
                while (j > 0 && ch != pattern[j]) j = pi[j - 1];
                if (ch == pattern[j]) j++;
                aut[state][c] = j;
            }
        }

        vector<int> dp(m, 0);
        dp[0] = 1;

        for (int step = 0; step < n; step++) {
            vector<int> next_dp(m, 0);
            for (int state = 0; state < m; state++) {
                if (!dp[state]) continue;
                for (int c = 0; c < 26; c++) {
                    int nxt = aut[state][c];
                    if (nxt < m) {
                        next_dp[nxt] = (next_dp[nxt] + dp[state]) % MOD;
                    }
                }
            }
            dp = move(next_dp);
        }

        long long total = 1;
        for (int i = 0; i < n; i++) {
            total = (total * 26) % MOD;
        }

        long long without = 0;
        for (int state = 0; state < m; state++) {
            without = (without + dp[state]) % MOD;
        }

        long long ans = (total - without + MOD) % MOD;
        return (int)ans;
    }
};
`
    }
  },
  {
    id: "cses-palindrome-queries",
    source: "cses",
    title: "Palindrome Queries",
    url: "https://cses.fi/problemset/task/2420",
    statement: [
      "You are given a string s of length n and a list of queries.",
      "There are two types of queries:",
      "1. ['1', k, c]: Change the character at 1-based index k to character c.",
      "2. ['2', a, b]: Determine if the substring from 1-based index a to b (inclusive) is a palindrome.",
      "For each type 2 query, return 'YES' if the substring is a palindrome, and 'NO' otherwise."
    ],
    constraints: [
      "1 <= s.length <= 200000",
      "1 <= queries.length <= 200000",
      "1 <= k <= s.length for type 1 queries",
      "1 <= a <= b <= s.length for type 2 queries",
      "All characters in s and updates are lowercase English letters"
    ],
    fn: {
      name: "palindromeQueries",
      params: [{ name: "s", type: "string" }, { name: "queries", type: "string[][]" }],
      returns: "string[]"
    },
    examples: [
      {
        input: [
          "aybabtu",
          [["2", "1", "3"], ["2", "3", "5"], ["1", "3", "x"], ["2", "3", "5"]]
        ],
        output: ["NO", "YES", "NO"],
        explanation: "Substring 'ayb' is not palindrome. 'bab' is palindrome. After changing index 3 to 'x', 'xab' is not palindrome."
      },
      {
        input: ["racecar", [["2", "1", "7"], ["2", "2", "6"]]],
        output: ["YES", "YES"],
        explanation: "Both 'racecar' and 'aceca' are palindromes."
      }
    ],
    tests: [
      {
        input: ["abc", [["2", "1", "1"], ["2", "2", "2"], ["2", "3", "3"]]],
        output: ["YES", "YES", "YES"]
      },
      {
        input: ["abba", [["2", "1", "4"], ["2", "2", "3"]]],
        output: ["YES", "YES"]
      },
      {
        input: ["abca", [["1", "3", "b"], ["2", "1", "4"]]],
        output: ["YES"]
      },
      {
        input: ["abcba", [["2", "1", "5"], ["1", "3", "d"], ["2", "1", "5"], ["1", "3", "c"], ["2", "1", "5"]]],
        output: ["YES", "YES", "YES"]
      },
      {
        input: ["a", [["2", "1", "1"]]],
        output: ["YES"]
      },
      {
        input: ["ab", [["2", "1", "2"]]],
        output: ["NO"]
      }
    ],
    hints: [
      "Checking whether a substring is a palindrome means comparing it with its reverse. How can you compare two long strings quickly while characters change?",
      "Hash the string forward and backward. A substring is a palindrome exactly when its forward hash equals its reversed hash, after the powers of the base are aligned.",
      "Keep two Fenwick trees of weighted character values, one for each direction, so that a change updates both in logarithmic time.",
      "Use a large modulus and align the powers of the base for both ranges before comparing the hashes.",
    ],
    solution: {
      idea: [
        "Maintain rolling polynomial hashes with double moduli (10^9 + 7 and 10^9 + 9) using Fenwick trees.",
        "One Fenwick tree maintains forward hash contributions s[i] * B^(i - 1), while the other maintains reversed contributions s[i] * B^(n - i).",
        "A point update changes the value at index k in both trees in O(log n) time.",
        "A range query normalizes hashes by dividing out powers of base B; if forward and reverse hashes match across both moduli, return 'YES', else 'NO'."
      ],
      complexity: "O((n + q) log n) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
    struct Fenwick {
        int n;
        long long mod;
        vector<long long> tree;
        Fenwick(int n, long long mod) : n(n), mod(mod), tree(n + 1, 0) {}
        void add(int i, long long delta) {
            delta = (delta % mod + mod) % mod;
            for (; i <= n; i += i & -i) {
                tree[i] = (tree[i] + delta) % mod;
            }
        }
        long long query(int i) {
            long long sum = 0;
            for (; i > 0; i -= i & -i) {
                sum = (sum + tree[i]) % mod;
            }
            return sum;
        }
        long long queryRange(int l, int r) {
            return (query(r) - query(l - 1) + mod) % mod;
        }
    };

    static long long power(long long base, long long exp, long long mod) {
        long long res = 1;
        base %= mod;
        while (exp > 0) {
            if (exp & 1) res = (res * base) % mod;
            base = (base * base) % mod;
            exp >>= 1;
        }
        return res;
    }

    static long long modInverse(long long n, long long m) {
        return power(n, m - 2, m);
    }

public:
    vector<string> palindromeQueries(string s, vector<vector<string>>& queries) {
        int n = s.size();
        const long long MOD1 = 1000000007;
        const long long B1 = 313;
        const long long MOD2 = 1000000009;
        const long long B2 = 353;

        vector<long long> p1(n + 1, 1), invP1(n + 1, 1);
        vector<long long> p2(n + 1, 1), invP2(n + 1, 1);
        long long invB1 = modInverse(B1, MOD1);
        long long invB2 = modInverse(B2, MOD2);

        for (int i = 1; i <= n; i++) {
            p1[i] = (p1[i - 1] * B1) % MOD1;
            invP1[i] = (invP1[i - 1] * invB1) % MOD1;
            p2[i] = (p2[i - 1] * B2) % MOD2;
            invP2[i] = (invP2[i - 1] * invB2) % MOD2;
        }

        Fenwick fwd1(n, MOD1), rev1(n, MOD1);
        Fenwick fwd2(n, MOD2), rev2(n, MOD2);

        for (int i = 1; i <= n; i++) {
            long long val = s[i - 1];
            fwd1.add(i, val * p1[i - 1]);
            rev1.add(i, val * p1[n - i]);
            fwd2.add(i, val * p2[i - 1]);
            rev2.add(i, val * p2[n - i]);
        }

        vector<string> results;
        for (const auto& q : queries) {
            if (q[0] == "1") {
                int k = stoi(q[1]);
                char c = q[2][0];
                long long oldVal = s[k - 1];
                long long newVal = c;
                long long diff = newVal - oldVal;
                s[k - 1] = c;

                fwd1.add(k, diff * p1[k - 1]);
                rev1.add(k, diff * p1[n - k]);
                fwd2.add(k, diff * p2[k - 1]);
                rev2.add(k, diff * p2[n - k]);
            } else {
                int a = stoi(q[1]);
                int b = stoi(q[2]);

                long long hFwd1 = (fwd1.queryRange(a, b) * invP1[a - 1]) % MOD1;
                long long hRev1 = (rev1.queryRange(a, b) * invP1[n - b]) % MOD1;

                long long hFwd2 = (fwd2.queryRange(a, b) * invP2[a - 1]) % MOD2;
                long long hRev2 = (rev2.queryRange(a, b) * invP2[n - b]) % MOD2;

                if (hFwd1 == hRev1 && hFwd2 == hRev2) {
                    results.push_back("YES");
                } else {
                    results.push_back("NO");
                }
            }
        }
        return results;
    }
};
`
    }
  }
];
