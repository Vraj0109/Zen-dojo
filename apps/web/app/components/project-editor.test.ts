// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { ProjectEditor, type ProjectReference } from "./project-editor";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("ProjectEditor full-screen and package tree features", () => {
  const initialFiles = [
    { name: "Main.java", content: "package demo;\n\npublic class Main {\n  public static void main(String[] args) {}\n}\n" },
    { name: "User.java", content: "package demo.model;\n\npublic class User {}\n" },
  ];

  const sampleReference: ProjectReference = {
    requirements: { title: "Parking Lot Specs", prompt: "Design a multi-floor parking lot." },
    walkthrough: [{ title: "Step 1: Core Entities", body: "Identify ParkingLot, Level, Spot, and Vehicle." }],
    diagrams: [{ title: "Class diagram", source: "classDiagram\nParkingLot --> Level" }],
    referenceFiles: [{ name: "RefParkingLot.java", code: "public class RefParkingLot {}" }],
  };

  it("renders the package tree with folders on the user's files", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(React.createElement(ProjectEditor, { projectId: "test-lld", initialFiles, reference: sampleReference }));
    });
    expect(container.textContent).toContain("demo");
    expect(container.textContent).toContain("demo.model");
    expect(container.textContent).toContain("Main.java");
    expect(container.textContent).toContain("User.java");
    root.unmount();
    container.remove();
  });

  it("toggles full-screen view and exits on button click", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(React.createElement(ProjectEditor, { projectId: "test-lld", initialFiles, reference: sampleReference }));
    });
    const fsBtn = container.querySelector('button[title="Full screen"]') as HTMLButtonElement;
    expect(fsBtn).toBeDefined();
    await act(async () => {
      fsBtn.click();
    });
    expect(container.querySelector('button[title="Exit full screen (Esc)"]')).toBeDefined();

    const exitBtn = container.querySelector('button[title="Exit full screen (Esc)"]') as HTMLButtonElement;
    await act(async () => {
      exitBtn.click();
    });
    expect(container.querySelector('button[title="Full screen"]')).toBeDefined();
    root.unmount();
    container.remove();
  });

  it("opens reference drawer when clicking reference buttons and closes with Esc", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(React.createElement(ProjectEditor, { projectId: "test-lld", initialFiles, reference: sampleReference }));
    });
    const reqBtn = Array.from(container.querySelectorAll("button")).find((b) => b.textContent === "Requirements");
    expect(reqBtn).toBeDefined();
    await act(async () => {
      reqBtn!.click();
    });
    expect(container.textContent).toContain("Parking Lot Specs");
    expect(container.textContent).toContain("Design a multi-floor parking lot.");

    // Escape closes drawer
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(container.textContent).not.toContain("Parking Lot Specs");
    root.unmount();
    container.remove();
  });

  it("explains a missing main instead of running, and can create Main.java", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const noMain = [{ name: "Cache.java", content: "public class Cache {\n    int size;\n}\n" }];
    await act(async () => {
      root.render(React.createElement(ProjectEditor, { projectId: "test-no-main", initialFiles: noMain }));
    });
    const button = (text: string) => Array.from(container.querySelectorAll("button")).find((b) => b.textContent === text);

    await act(async () => {
      button("Run file")!.click();
    });
    expect(container.textContent).toContain("Cache.java has no main method.");
    expect(button("Add a main method")).toBeDefined();

    await act(async () => {
      button("Run project")!.click();
    });
    expect(container.textContent).toContain("No class in this project has a main method");
    await act(async () => {
      button("Create Main.java")!.click();
    });
    expect(container.textContent).toContain("Main.java");
    expect(container.textContent).not.toContain("No class in this project has a main method");
    root.unmount();
    container.remove();
    window.localStorage.clear();
  });

  it("allows switching between reference tabs", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(React.createElement(ProjectEditor, { projectId: "test-lld", initialFiles, reference: sampleReference }));
    });
    const wtBtn = Array.from(container.querySelectorAll("button")).find((b) => b.textContent === "Walkthrough");
    await act(async () => {
      wtBtn!.click();
    });
    expect(container.textContent).toContain("Step 1: Core Entities");

    const refBtn = Array.from(container.querySelectorAll("button")).find((b) => b.textContent === "Reference code");
    await act(async () => {
      refBtn!.click();
    });
    expect(container.textContent).toContain("RefParkingLot.java");
    root.unmount();
    container.remove();
  });
});
