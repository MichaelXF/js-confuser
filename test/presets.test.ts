import presets from "../src/presets";
import { validateOptions } from "../src/validateOptions";

test.each(Object.keys(presets))(
  "Variant #1: Preset is valid options",
  (presetName) => {
    const preset = presets[presetName];
    expect(typeof preset).toStrictEqual("object");

    expect(preset.preset).toStrictEqual(presetName);

    // Validate options
    expect(() => {
      validateOptions(preset);
    }).not.toThrow();
  }
);
