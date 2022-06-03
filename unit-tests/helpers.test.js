const helpers = require("../lib/helpers");
const { assert, util } = require("chai");
const {
  checkResourceTests,
  expectedResourceAddress,
  childArraySearch,
  convertTfVarsFromTags,
} = require("../lib/helpers");

describe("helpers", () => {
  describe("keycontainsKeys", () => {
    it("should return true if key is found in object", () => {
      assert.isTrue(
        helpers.containsKeys({ test: true }, "test"),
        "it should return true"
      );
    });
    it("should return false if key is found in object", () => {
      assert.isFalse(helpers.containsKeys({}, "test"), "it should return true");
    });
    it("should return false if the type passed is not object", () => {
      assert.isFalse(
        helpers.containsKeys("frog", "test"),
        "it should return false"
      );
    });
  });
  describe("checkResourceTests", () => {
    it("should add empty values object to tests passed with no values param", () => {
      let tests = [
        {
          name: "test",
          address: "test",
        },
      ];
      checkResourceTests(tests);
      assert.deepEqual(tests[0].values, {}, "it should add empty object");
    });
    it("should not throw an error if everything is correct", () => {
      let test = () => {
        checkResourceTests([
          {
            name: "test",
            address: "test",
            values: {},
          },
        ]);
      };
      assert.doesNotThrow(test, "it should not throw an error");
    });
  });
  describe("composeName", () => {
    it("should compose a name from a resource not in a module", () => {
      let actualData = helpers.composeName({
        name: "test",
        mode: "managed",
        type: "test",
      });
      let expectedData = "test.test";
      assert.deepEqual(
        actualData,
        expectedData,
        "it should return composed name"
      );
    });
    it("should compose a name from a data resource", () => {
      let actualData = helpers.composeName({
        module: "test",
        name: "test",
        mode: "data",
        type: "test",
      });
      let expectedData = "test.data.test.test";
      assert.deepEqual(
        actualData,
        expectedData,
        "it should return composed name"
      );
    });
  });
  describe("childArraySearch", () => {
    it("should return correct object for found parent address", () => {
      let data = helpers.childArraySearch("found", [
        {
          address: "found",
        },
      ]);
      assert.deepEqual(data, {
        containsKeysModule: true,
        moduleData: {
          address: "found",
        },
      });
    });
    it("should return correct object for unfound parent address", () => {
      let data = helpers.childArraySearch("missing", [
        {
          address: "found",
        },
      ]);
      assert.deepEqual(
        data,
        { containsKeysModule: false, moduleData: undefined },
        "should contain correct data"
      );
    });
    it("should search child modules of child modules for address", () => {
      let data = childArraySearch("module.ez_vpc.module.vpc", [
        {
          address: "module.ez_vpc",
          child_modules: [
            {
              address: "module.ez_vpc.module.vpc",
            },
          ],
        },
      ]);
      let expectedData = {
        containsKeysModule: true,
        moduleData: {
          address: "module.ez_vpc.module.vpc",
        },
      };
      assert.deepEqual(data, expectedData, "it should return correct data");
    });
  });
  it("should search child modules of child modules of child_modules for address", () => {
    let data = childArraySearch(
      "module.ez_vpc.module.vpc.module.test_module.module.deep_test2",
      [
        {
          address: "module.ez_vpc",
          child_modules: [
            {
              address: "module.ez_vpc.module.vpc",
              child_modules: [
                {
                  address: "module.ez_vpc.module.vpc.module.test_module",
                  child_modules: [
                    {
                      address:
                        "module.ez_vpc.module.vpc.module.test_module.module.deep_test",
                    },
                    {
                      address:
                        "module.ez_vpc.module.vpc.module.test_module.module.deep_test2",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ]
    );
    let expectedData = {
      containsKeysModule: true,
      moduleData: {
        address:
          "module.ez_vpc.module.vpc.module.test_module.module.deep_test2",
      },
    };
    assert.deepEqual(data, expectedData, "it should return correct data");
  });
  describe("getFoundResources", () => {
    it("should return correct array when none unexpected resources found and address is empty string", () => {
      let data = helpers.getFoundResources(
        [
          {
            address: "test.test",
          },
        ],
        "",
        ["test.test"]
      );
      assert.deepEqual(data.length, 0, "should return empty array");
    });
    it("should return correct array when none unexpected resources found and address is not empty string", () => {
      let data = helpers.getFoundResources(
        [
          {
            address: "test.test",
          },
        ],
        "frog",
        ["frog.test.test"]
      );
      assert.deepEqual(data.length, 0, "should return empty array");
    });
    it("should return correct array when an unexpected resource is found", () => {
      let data = helpers.getFoundResources(
        [
          {
            address: "test.test",
          },
        ],
        "test.test",
        ["frog.test.test"]
      );
      assert.deepEqual(data, ["test.test"], "should return empty array");
    });
  });
  describe("valueFunctionTest", () => {
    let valueFunctionTest = helpers.valueFunctionTest;
    it("should return bad results if everything is correct but data isn't found", () => {
      let data = valueFunctionTest((frog) => {
        return "uh-oh";
      });
      assert.deepEqual(data, {
        appendMessage: "to exist in module, got undefined.",
        expectedData: false,
      });
    });
  });
  describe("checkModuleTest", () => {
    let checkModuleTest = helpers.checkModuleTest;
    it("should throw an error if no root_module", () => {
      let task = () => {
        checkModuleTest("root_module", {});
      };
      assert.throws(
        task,
        "Expected terraform plan to have root_module at top level. Check your plan configuration and try again."
      );
    });
    it("should throw an error if no resources are found and parent is root_module", () => {
      let task = () => {
        checkModuleTest("root_module", { root_module: {} });
      };
      assert.throws(
        task,
        "Expected root module to have resources. Check your plan configuration and try again."
      );
    });
    it("should throw an error if resources is empty and parent is root_module", () => {
      let task = () => {
        checkModuleTest("root_module", {
          root_module: {
            resources: [],
          },
        });
      };
      assert.throws(
        task,
        "Expected root_modules to contain at least one resource. Check your plan configuration and try again."
      );
    });
    it("should throw an error if address is not root module and child modules length is 0", () => {
      let task = () => {
        checkModuleTest("module.test", {
          root_module: {
            child_modules: [],
          },
        });
      };
      assert.throws(
        task,
        "Expected child_modules to be created. Check your plan configuration and try again."
      );
    });
    it("should throw an error if no root module is found", () => {
      let task = () => {
        checkModuleTest("module.test", {});
      };
      assert.throws(
        task,
        "Expected terraform plan to have root_module at top level. Check your plan configuration and try again."
      );
    });
    it("should throw an error if not child modules", () => {
      let task = () => {
        checkModuleTest("module.test", { root_module: {} });
      };
      assert.throws(
        task,
        "Expected terraform plan root_module to have child_modules. Check your plan configuration and try again."
      );
    });
    it("should return moduleData and parentAddress if everything is good", () => {
      let actualData = checkModuleTest("root_module", {
        root_module: { resources: ["test"] },
      });
      let expectedData = {
        moduleData: {
          address: "root_module",
          resources: ["test"],
        },
        parentAddress: "",
      };
      assert.deepEqual(
        actualData,
        expectedData,
        "it should return the correct data"
      );
    });
  });
  describe("parseTestModuleOptions", () => {
    let parseTestModuleOptions = helpers.parseTestModuleOptions;
    it("should return the defaults if no options are passed other than tfData", () => {
      let actualData = parseTestModuleOptions({
        tfData: true,
      });
      assert.isTrue(actualData.tfData, "should have passed data");
      assert.deepEqual("", actualData.address, "should have default data");
      assert.isFalse(actualData.callback, "should have default data");
      assert.isFalse(actualData.isApply, "should have default data");
      assert.deepEqual(actualData.testList, [], "should have default data"),
        assert.deepEqual(actualData.moduleName, "", "should have default data");
    });
    it("should overwrite any passed data", () => {
      let actualData = parseTestModuleOptions({
        tfData: true,
        address: 1234,
        callback: "hello",
        isApply: true,
        moduleName: "test",
        testList: [1234],
      });
      assert.isTrue(actualData.tfData, "should have passed data");
      assert.deepEqual(actualData.address, 1234, "should have default data");
      assert.deepEqual(
        actualData.callback,
        "hello",
        "should have default data"
      );
      assert.isTrue(actualData.isApply, "should have default data");
      assert.deepEqual(actualData.testList, [1234], "should have default data"),
        assert.deepEqual(
          actualData.moduleName,
          "test",
          "should have default data"
        );
    });
  });
  describe("containsKeysModule", () => {
    let containsKeysModule = helpers.containsKeysModule;
    it("should return true if moduleData.address and address match", () => {
      assert.isTrue(
        containsKeysModule({ address: "test" }, "test"),
        "should return true"
      );
    });
    it("should return false if not found", () => {
      assert.isFalse(
        containsKeysModule({ address: "test" }, "fail"),
        "should return true"
      );
    });
    it("should return properly formatted data when a child is found", () => {
      let actualData = containsKeysModule(
        {
          address: "test",
          child_modules: [
            {
              address: "test.child.test",
            },
          ],
        },
        "child.test"
      );
      let expectedData = {
        containsKeysModule: true,
        moduleData: {
          address: "test.child.test",
        },
        parentAddress: "test.child.test",
      };
      assert.deepEqual(
        actualData,
        expectedData,
        "it should return correct object"
      );
    });
  });
  describe("expectedResourceAddress", () => {
    it("should return address plus resource address if not parent address", () => {
      let actualData = expectedResourceAddress(undefined, "one", "two");
      assert.deepEqual(
        actualData,
        "two.one",
        "it should return correct string"
      );
    });
  });
  describe("azsort", () => {
    it("should return -1 if string a is less than string b", () => {
      let actualData = helpers.azsort("a", "b");
      assert.deepEqual(actualData, -1, "it should return -1");
    });
    it("should return 1 if string a is greater than string b", () => {
      let actualData = helpers.azsort(3, 2);
      assert.deepEqual(actualData, 1, "it should return 11");
    });
    it("should return 0 if string a is equal to string b", () => {
      let actualData = helpers.azsort(2, 2);
      assert.deepEqual(actualData, 0, "it should return 11");
    });
  });
  describe("tfVarCheck", () => {
    let tfVarCheck = helpers.tfVarCheck;
    it("should not throw if string, boolean, and number are passed", () => {
      let data = {
        one: 1,
        two: "two",
        three: true,
      };
      let task = () => {
        tfVarCheck(data);
      };
      assert.doesNotThrow(task, "everything is fine");
    });
    it("should  throw if types other than string, boolean, and number are passed", () => {
      let data = {
        one: [],
        two: {},
        three: true,
      };
      let task = () => {
        tfVarCheck(data);
      };
      assert.throws(
        task,
        "\u001b[31mExpected type of string, number, or boolean for one got string\u001b[39m\n\u001b[31mExpected type of string, number, or boolean for two got string\u001b[39m"
      );
    });
  });
  describe("capitalizeWords", () => {
    it("should return capitalized words", () => {
      let actualData = helpers.capitalizeWords(
        "all lowercase words separated by spaces"
      );
      let expectedData = "All Lowercase Words Separated By Spaces";
      assert.deepEqual(
        actualData,
        expectedData,
        "It should correctly format the string"
      );
    });
  });
  describe("deepObjectIgnoreNullValues", () => {
    let deepObjectIgnoreNullValues = helpers.deepObjectIgnoreNullValues;
    it("should remove all null values from an object with sub object", () => {
      let testData = {
        test: {
          test2: {
            test3: null,
            test4: "hello",
          },
          test23: {
            test5: null,
          },
        },
        test6: "world",
      };
      let actualData = deepObjectIgnoreNullValues(testData);
      let expectedData = {
        test: {
          test2: {
            test4: "hello",
          },
        },
        test6: "world",
      };
      assert.deepEqual(
        actualData,
        expectedData,
        "should return correct object"
      );
    });
    it("should remove all null values top level when shallow", () => {
      let testData = {
        test: {
          test2: {
            test3: null,
            test4: "hello",
          },
          test23: {
            test5: null,
          },
        },
        test6: "world",
        top_level_null: null,
      };
      let actualData = deepObjectIgnoreNullValues(testData, true);
      let expectedData = {
        test: {
          test2: {
            test3: null,

            test4: "hello",
          },
          test23: {
            test5: null,
          },
        },
        test6: "world",
      };
      assert.deepEqual(
        actualData,
        expectedData,
        "should return correct object"
      );
    });
  });
  describe("formatModuleName", () => {
    let formatModuleName = helpers.formatModuleName;
    it("should create a name for a top level module", () => {
      let actualData = formatModuleName("module.test_module")
      let expectedData = "Test Module"
      assert.deepEqual(actualData, expectedData, "it should return correct name")
    })
    it("should create a name for a child module", () => {
      let actualData = formatModuleName("module.test_module[\"frog\"].module.child.module.deep_child")
      let expectedData = "Deep Child"
      assert.deepEqual(actualData, expectedData, "it should return correct name")
    })
  })
  describe("convertTfVarsFromTags", () => {
    it("should return empty object when no planFlagValues.tfvars", () => {
      let actualData = convertTfVarsFromTags({})
      let expectedData = {}
      assert.deepEqual(actualData, expectedData, "it should return empty object")
    })
  })
});
