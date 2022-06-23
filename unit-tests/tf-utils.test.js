const { assert } = require("chai");
const {
  notFalseTest,
  deepEqualTest,
  isTrueTest,
} = require("../lib/builders.js");
const tfUnitTestUtils = require("../lib/tf-utils.js");
const mocks = require("./tfx.mocks");
const sinon = require("sinon");

// Initialize mocks for unit testing
let mock = new mocks();

// Initialize mocks to test against `mock`
let tfUtilMocks = new mocks();

//Initialize spies
let describeSpy = new sinon.spy();
let itSpy = new sinon.spy();

// create new tfutils overriding describe, it, and assert for unit testing
const tfutils = new tfUnitTestUtils({
  overrideDescribe: (definition, callback) => {
    describeSpy(definition);
    return callback();
  },
  overrideIt: (definition, callback) => {
    itSpy(definition);
    return callback();
  }, 
  overrideAssert: assert,
});

describe("tfUnitTestUtils", () => {
  describe("override chai utils", () => {
    let defaultTfUtils = new tfUnitTestUtils();
    it("should use the chai it function if not override option passed", () => {
      assert.deepEqual(
        defaultTfUtils.it.toString(),
        it.toString(),
        "it should have correct it function"
      );
    });
    it("should use the chai describe function if not override option passed", () => {
      assert.deepEqual(
        defaultTfUtils.describe.toString(),
        describe.toString(),
        "it should have correct describe function"
      );
    });
    it("should use the chai assert function if not override option passed", () => {
      assert.deepEqual(
        defaultTfUtils.assert,
        assert,
        "it should have correct assert function"
      );
    });
    it("should not use the chai it function if override option passed", () => {
      assert.notDeepEqual(
        tfutils.it.toString(),
        it.toString(),
        "it should have correct it function"
      );
    });
    it("should not use the chai describe function if override option passed", () => {
      assert.notDeepEqual(
        tfutils.describe.toString(),
        describe.toString(),
        "it should have correct describe function"
      );
    });
    it("should not use the chai assert function if override option passed", () => {
      assert.deepEqual(
        tfutils.assert.toString(),
        assert.toString(),
        "it should have correct assert function"
      );
    });
  });
  describe("buildResourceTest", () => {
    let buildResourceTest = new sinon.spy(tfutils, "buildResourceTest");
    it("should return describe and tests", () => {
      buildResourceTest("test", {}, "test.test", {});
      assert.isTrue(
        buildResourceTest.returned({
          describe: "test",
          tests: [
            notFalseTest("Module undefined should contain resource test.test", [
              false,
              "Expected undefined contain the test resource.",
            ]),
          ],
        }),
        "it should return the correct tests"
      );
    });
    it("should return tests for each key if the resourceData has values and planValues is passed and resource exists in root module", () => {
      buildResourceTest(
        "test",
        {
          address: "root_module",
          resources: [
            {
              address: "test.test",
              values: {
                test_value: 3,
              },
            },
          ],
        },
        "test.test",
        {
          test_value: 3,
        }
      );
      assert.isTrue(
        buildResourceTest.returned({
          describe: "test",
          tests: [
            notFalseTest(
              "Module root_module should contain resource test.test",
              [true, "Expected root_module contain the test resource."]
            ),
            deepEqualTest("test should have the correct test_value value", [
              3,
              3,
              "Expected test.test to have correct value for test_value.",
            ]),
          ],
        }),
        "it should return the correct tests"
      );
    });
    it("should return tests for each key if the resourceData has values and planValues is passed and resource exists in child module", () => {
      buildResourceTest(
        "test",
        {
          address: "module.test",
          resources: [
            {
              address: "different.resource",
            },
            {
              address: "module.test.test.test",
              values: {
                test_value: 3,
              },
            },
          ],
        },
        "test.test",
        {
          test_value: 3,
        }
      );
      assert.isTrue(
        buildResourceTest.returned({
          describe: "test",
          tests: [
            notFalseTest(
              "Module module.test should contain resource test.test",
              [true, "Expected module.test contain the test resource."]
            ),
            deepEqualTest("test should have the correct test_value value", [
              3,
              3,
              "Expected test.test to have correct value for test_value.",
            ]),
          ],
        }),
        "it should return the correct tests"
      );
    });
  });
  describe("buildModuleTest", () => {
    let buildModuleTest = new sinon.spy(tfutils, "buildModuleTest");
    it("should build tests for a correctly formatted module", () => {
      buildModuleTest(
        "moduleName",
        "root_module",
        {
          root_module: {
            address: "root_module",
            resources: [
              {
                address: "test",
              },
            ],
          },
        },
        [
          {
            name: "test",
            address: "test",
            values: {
              test: false,
            },
          },
        ]
      );
      assert.isTrue(
        buildModuleTest.returned({
          describe: "Module moduleName",
          tests: [
            isTrueTest("Plan should contain the module root_module", [
              true,
              "The module root_module should exist in the terraform plan.",
            ]),
            {
              describe: "test",
              tests: [
                notFalseTest(
                  "Module root_module should contain resource test",
                  [true, "Expected root_module contain the test resource."]
                ),
                notFalseTest("test should have the correct test value", [
                  false,
                  "Expected test to have correct value for test got undefined.",
                ]),
              ],
            },
            deepEqualTest(
              "root_module should not contain additional resources",
              [
                ["test"],
                ["test"],
                "The module root_module should not contain any resources in addition to ones passed",
              ]
            ),
          ],
        }),
        "should return correct data"
      );
    });
    it("should build tests for a correctly formatted module with no tests", () => {
      buildModuleTest(
        "moduleName",
        "root_module",
        {
          root_module: {
            address: "root_module",
            resources: [
              {
                address: "test",
              },
            ],
          },
        },
        []
      );
      assert.isTrue(
        buildModuleTest.returned({
          describe: "Module moduleName",
          tests: [
            isTrueTest("Plan should contain the module root_module", [
              true,
              "The module root_module should exist in the terraform plan.",
            ]),
            deepEqualTest(
              "root_module should not contain additional resources",
              [
                ["test"],
                [],
                "The module root_module should not contain any resources in addition to ones passed",
              ]
            ),
          ],
        }),
        "should return correct data"
      );
    });
    it("should build tests for a correctly formatted child module", () => {
      buildModuleTest(
        "moduleName",
        "module.child",
        {
          root_module: {
            address: "root_module",
            resources: [
              {
                address: "test",
              },
            ],
            child_modules: [
              {
                address: "module.frog",
              },
              {
                address: "module.child",
                resources: [
                  {
                    address: "module.child.test",
                    values: {
                      test: false,
                    },
                  },
                ],
              },
            ],
          },
        },
        [
          {
            name: "test",
            address: "test",
            values: {
              test: false,
            },
          },
        ]
      );
      assert.isTrue(
        buildModuleTest.returned({
          describe: "Module moduleName",
          tests: [
            isTrueTest("Plan should contain the module module.child", [
              true,
              "The module module.child should exist in the terraform plan.",
            ]),
            {
              describe: "test",
              tests: [
                notFalseTest(
                  "Module module.child should contain resource test",
                  [true, "Expected module.child contain the test resource."]
                ),
                deepEqualTest("test should have the correct test value", [
                  false,
                  false,
                  "Expected test to have correct value for test.",
                ]),
              ],
            },
            deepEqualTest(
              "module.child should not contain additional resources",
              [
                ["module.child.test"],
                ["module.child.test"],
                "The module module.child should not contain any resources in addition to ones passed",
              ]
            ),
          ],
        }),
        "should return correct data"
      );
    });
    it("should build tests for a correctly formatted child module with no resources", () => {
      buildModuleTest(
        "moduleName",
        "module.child",
        {
          root_module: {
            address: "root_module",
            resources: [
              {
                address: "test",
              },
            ],
            child_modules: [
              {
                address: "module.frog",
              },
              {
                address: "module.child",
              },
            ],
          },
        },
        [
          {
            name: "test",
            address: "test",
            values: {
              test: false,
            },
          },
        ]
      );
      assert.isTrue(
        buildModuleTest.returned({
          describe: "Module moduleName",
          tests: [
            isTrueTest("Plan should contain the module module.child", [
              true,
              "The module module.child should exist in the terraform plan.",
            ]),
            {
              describe: "test",
              tests: [
                notFalseTest(
                  "Module module.child should contain resource test",
                  [false, "Expected module.child contain the test resource."]
                ),
                notFalseTest("test should have the correct test value", [
                  false,
                  "Expected test to have correct value for test got undefined.",
                ]),
              ],
            },
            deepEqualTest("module.child should contain specified resources", [
              [],
              ["module.child.test"],
              "The module module.child should contain all resources expected",
            ]),
          ],
        })
      );
    });
    it("should build tests for unfound module", () => {
      buildModuleTest(
        "moduleName",
        "module.missing",
        {
          root_module: {
            address: "root_module",
            resources: [
              {
                address: "test",
              },
            ],
            child_modules: [
              {
                address: "module.frog",
              },
              {
                address: "module.child",
                resources: [
                  {
                    address: "module.child.test",
                    values: {
                      test: false,
                    },
                  },
                ],
              },
            ],
          },
        },
        [
          {
            name: "test",
            address: "test",
            values: {
              test: false,
            },
          },
        ]
      );
      assert.isTrue(
        buildModuleTest.returned({
          describe: "Module moduleName",
          tests: [
            isTrueTest("Plan should contain the module module.missing", [
              false,
              "The module module.missing should exist in the terraform plan.",
            ]),
          ],
        }),
        "should return correct data"
      );
    });
  });
  describe("buildInstanceTest", () => {
    let buildInstanceTest = new sinon.spy(tfutils, "buildInstanceTest");
    it("should return the correct test for a function for unfound attribute of instance at index 0", () => {
      buildInstanceTest(
        "module.landing_zone.ibm_atracker_target.atracker_target",

        {
          resources: [
            {
              module: "module.landing_zone",
              mode: "managed",
              type: "ibm_atracker_target",
              name: "atracker_target",
              instances: [
                {
                  attributes: {
                    shame: "ut-atracker",
                  },
                },
              ],
            },
          ],
        },
        {
          0: {
            name: function (value) {
              return {
                expectedData: value.indexOf("ut-") !== -1,
                appendMessage: "to contain the prefix `ut-`.",
              };
            },
          },
        }
      );
      assert.isTrue(
        buildInstanceTest.returned({
          describe: "module.landing_zone.ibm_atracker_target.atracker_target",
          tests: [
            notFalseTest(
              "Resource module.landing_zone.ibm_atracker_target.atracker_target should be in tfstate",
              [
                true,
                "Expected module.landing_zone.ibm_atracker_target.atracker_target resource to be included in tfstate",
              ]
            ),
            isTrueTest(
              "Expected resource module.landing_zone.ibm_atracker_target.atracker_target[0] to have correct value for name.",
              [
                false,
                "Expected module.landing_zone.ibm_atracker_target.atracker_target[0] name to exist in module, got undefined.",
              ]
            ),
            isTrueTest(
              "Expected instance with key 0 to exist at module.landing_zone.ibm_atracker_target.atracker_target",
              [
                true,
                "Expected instance with key 0 to exist at module.landing_zone.ibm_atracker_target.atracker_target.instances",
              ]
            ),
          ],
        })
      );
    });
    it("should return the correct test for an object nested in an array with only one object where it exists", () => {
      buildInstanceTest(
        "module.landing_zone.ibm_atracker_target.atracker_target",
        {
          resources: [
            {
              module: "module.landing_zone",
              mode: "managed",
              type: "ibm_atracker_target",
              name: "atracker_target",
              instances: [
                {
                  attributes: {
                    name: "ut-atracker",
                    cos_endpoint: [
                      {
                        api_key: "REDACTED",
                      },
                    ],
                  },
                },
              ],
            },
          ],
        },
        {
          0: {
            cos_endpoint: {
              api_key: "REDACTED",
            },
          },
        }
      );
      assert.isTrue(
        buildInstanceTest.returned({
          describe: "module.landing_zone.ibm_atracker_target.atracker_target",
          tests: [
            notFalseTest(
              "Resource module.landing_zone.ibm_atracker_target.atracker_target should be in tfstate",
              [
                true,
                "Expected module.landing_zone.ibm_atracker_target.atracker_target resource to be included in tfstate",
              ]
            ),
            isTrueTest(
              "Expected instance with key 0 to exist at module.landing_zone.ibm_atracker_target.atracker_target",
              [
                true,
                "Expected instance with key 0 to exist at module.landing_zone.ibm_atracker_target.atracker_target.instances",
              ]
            ),
            notFalseTest(
              "Expected resource module.landing_zone.ibm_atracker_target.atracker_target[0] to have value for cos_endpoint",
              [
                true,
                "Expected module.landing_zone.ibm_atracker_target.atracker_target[0] attribute cos_endpoint to exist",
              ]
            ),
            deepEqualTest(
              "Expected resource module.landing_zone.ibm_atracker_target.atracker_target[0] to have correct value for cos_endpoint[0].api_key",
              [
                "REDACTED",
                "REDACTED",
                "Expected module.landing_zone.ibm_atracker_target.atracker_target[0] attribute cos_endpoint[0].api_key to be REDACTED",
              ]
            ),
          ],
        })
      );
    });
    it("should return the correct test for an object nested in an array with only one object where it exists and the value is evaluated with a function", () => {
      buildInstanceTest(
        "module.landing_zone.ibm_atracker_target.atracker_target",
        {
          resources: [
            {
              module: "module.landing_zone",
              mode: "managed",
              type: "ibm_atracker_target",
              name: "atracker_target",
              instances: [
                {
                  attributes: {
                    name: "ut-atracker",
                    cos_endpoint: [
                      {
                        api_key: "REDACTED",
                      },
                    ],
                  },
                },
              ],
            },
          ],
        },
        {
          0: {
            cos_endpoint: {
              api_key: function (value) {
                return {
                  expectedData: value === "REDACTED",
                  appendMessage: "to be equal to REDACTED",
                };
              },
            },
          },
        }
      );
      assert.isTrue(
        buildInstanceTest.returned({
          describe: "module.landing_zone.ibm_atracker_target.atracker_target",
          tests: [
            notFalseTest(
              "Resource module.landing_zone.ibm_atracker_target.atracker_target should be in tfstate",
              [
                true,
                "Expected module.landing_zone.ibm_atracker_target.atracker_target resource to be included in tfstate",
              ]
            ),
            isTrueTest(
              "Expected instance with key 0 to exist at module.landing_zone.ibm_atracker_target.atracker_target",
              [
                true,
                "Expected instance with key 0 to exist at module.landing_zone.ibm_atracker_target.atracker_target.instances",
              ]
            ),
            notFalseTest(
              "Expected resource module.landing_zone.ibm_atracker_target.atracker_target[0] to have value for cos_endpoint",
              [
                true,
                "Expected module.landing_zone.ibm_atracker_target.atracker_target[0] attribute cos_endpoint to exist",
              ]
            ),
            isTrueTest(
              "Expected resource module.landing_zone.ibm_atracker_target.atracker_target[0] to have correct value for cos_endpoint[0].api_key",
              [
                true,
                "Expected module.landing_zone.ibm_atracker_target.atracker_target[0] attribute cos_endpoint[0].api_key to be equal to REDACTED",
              ]
            ),
          ],
        })
      );
    });
    it("should return the correct test for an object nested in an array with only one object where it exists and the value is evaluated with a function", () => {
      buildInstanceTest(
        "module.landing_zone.ibm_atracker_target.atracker_target",
        {
          resources: [
            {
              module: "module.landing_zone",
              mode: "managed",
              type: "ibm_atracker_target",
              name: "atracker_target",
            },
          ],
        },
        {
          0: {
            cos_endpoint: {
              api_key: function (value) {
                return {
                  expectedData: value === "REDACTED",
                  appendMessage: "to be equal to REDACTED",
                };
              },
            },
          },
        }
      );
      assert.isTrue(
        buildInstanceTest.returned({
          describe: "module.landing_zone.ibm_atracker_target.atracker_target",
          tests: [
            {
              name: "Resource module.landing_zone.ibm_atracker_target.atracker_target should be in tfstate",
              assertionType: "isNotFalse",
              assertionArgs: [
                true,
                "Expected module.landing_zone.ibm_atracker_target.atracker_target resource to be included in tfstate",
              ],
            },
            isTrueTest(
              "Expected module.landing_zone.ibm_atracker_target.atracker_target to contain instance data got undefined",
              [undefined, `Expected instances to be present.`]
            ),
          ],
        })
      );
    });
  });
  describe("buildStateTest", () => {
    let buildStateTest = new sinon.spy(tfutils, "buildStateTest");
    it("should return a list of instance tests based on the module name, tfstate, and instance tests", () => {
      let tfstate = {
        resources: [
          {
            module: "module.landing_zone",
            mode: "data",
            type: "ibm_container_cluster_versions",
            name: "cluster_versions",
            instances: [
              {
                index_key: 0,
                attributes: {
                  name: "name-one",
                },
              },
              {
                index_key: "test",
                attributes: {
                  name: "name-two",
                },
              },
            ],
          },
          {
            module: "module.landing_zone",
            mode: "data",
            type: "ibm_resource_instance",
            name: "cos",
            provider: 'provider["registry.terraform.io/ibm-cloud/ibm"]',
            instances: [],
          },
        ],
      };
      buildStateTest("Landing Zone", tfstate, [
        {
          name: "module.landing_zone.data.ibm_container_cluster_versions.cluster_versions",
          address:
            "module.landing_zone.data.ibm_container_cluster_versions.cluster_versions",
          instances: [
            {
              name: "name-one",
            },
            {
              index_key: "test",
              name: "name-two",
            },
            {
              index_key: "bad-index",
            },
          ],
        },
      ]);
      assert.isTrue(
        buildStateTest.returned({
          describe: "Landing Zone",
          tests: [
            {
              describe:
                "module.landing_zone.data.ibm_container_cluster_versions.cluster_versions",
              tests: [
                notFalseTest(
                  "Resource module.landing_zone.data.ibm_container_cluster_versions.cluster_versions should be in tfstate",
                  [
                    true,
                    "Expected module.landing_zone.data.ibm_container_cluster_versions.cluster_versions resource to be included in tfstate",
                  ]
                ),
                deepEqualTest(
                  "Expected resource module.landing_zone.data.ibm_container_cluster_versions.cluster_versions[0] to have correct value for name.",
                  [
                    "name-one",
                    "name-one",
                    "Expected module.landing_zone.data.ibm_container_cluster_versions.cluster_versions[0] name to have value name-one",
                  ]
                ),
                isTrueTest(
                  "Expected instance with key 0 to exist at module.landing_zone.data.ibm_container_cluster_versions.cluster_versions",
                  [
                    true,
                    "Expected instance with key 0 to exist at module.landing_zone.data.ibm_container_cluster_versions.cluster_versions.instances",
                  ]
                ),
                deepEqualTest(
                  "Expected resource module.landing_zone.data.ibm_container_cluster_versions.cluster_versions[test] to have correct value for name.",
                  [
                    "name-two",
                    "name-two",
                    "Expected module.landing_zone.data.ibm_container_cluster_versions.cluster_versions[test] name to have value name-two",
                  ]
                ),
                isTrueTest(
                  "Expected instance with key test to exist at module.landing_zone.data.ibm_container_cluster_versions.cluster_versions",
                  [
                    true,
                    "Expected instance with key test to exist at module.landing_zone.data.ibm_container_cluster_versions.cluster_versions.instances",
                  ]
                ),
                isTrueTest(
                  "Expected instance with key bad-index to exist at module.landing_zone.data.ibm_container_cluster_versions.cluster_versions",
                  [
                    false,
                    "Expected instance with key bad-index to exist at module.landing_zone.data.ibm_container_cluster_versions.cluster_versions.instances",
                  ]
                ),
              ],
            },
          ],
        }),
        "It should return correct instance test data"
      );
    });
    it("should correctly return a list of tests for resources in root_module", () => {
      let tfstate = {
        resources: [
          {
            mode: "data",
            type: "external",
            name: "example",
            provider: 'provider["registry.terraform.io/hashicorp/external"]',
            instances: [
              {
                schema_version: 0,
                attributes: {
                  id: "-",
                  program: ["sh", "./test-output.sh", "example", "test"],
                  query: null,
                  result: {
                    data: "example-test-value",
                  },
                  working_dir: null,
                },
                sensitive_attributes: [],
              },
            ],
          },
        ],
      };
      buildStateTest("External Data Source", tfstate, [
        {
          name: "External Data Source",
          address: "data.external.example",
          instances: [
            {
              id: "-",
              program: ["sh", "./test-output.sh", "example", "test"],
              result: {
                data: "example-test-value",
              },
            },
          ],
        },
      ]);
      assert.isTrue(
        buildStateTest.returned({
          describe: "External Data Source",
          tests: [
            {
              describe: "data.external.example",
              tests: [
                {
                  name: "Resource data.external.example should be in tfstate",
                  assertionType: "isNotFalse",
                  assertionArgs: [
                    true,
                    "Expected data.external.example resource to be included in tfstate",
                  ],
                },
                {
                  name: "Expected resource data.external.example[0] to have correct value for id.",
                  assertionType: "deepEqual",
                  assertionArgs: [
                    "-",
                    "-",
                    "Expected data.external.example[0] id to have value -",
                  ],
                },
                {
                  name: "Expected resource data.external.example[0] to have correct value for program.",
                  assertionType: "deepEqual",
                  assertionArgs: [
                    ["sh", "./test-output.sh", "example", "test"],
                    ["sh", "./test-output.sh", "example", "test"],
                    'Expected data.external.example[0] program to have value ["sh","./test-output.sh","example","test"]',
                  ],
                },
                {
                  name: "Expected resource data.external.example[0] to have correct value for result.",
                  assertionType: "deepEqual",
                  assertionArgs: [
                    {
                      data: "example-test-value",
                    },
                    {
                      data: "example-test-value",
                    },
                    'Expected data.external.example[0] result to have value {"data":"example-test-value"}',
                  ],
                },
                {
                  name: "Expected instance with key 0 to exist at data.external.example",
                  assertionType: "isTrue",
                  assertionArgs: [
                    true,
                    "Expected instance with key 0 to exist at data.external.example.instances",
                  ],
                },
              ],
            },
          ],
        }),
        "it should return correct data"
      );
    });
  });
  describe("testModule", () => {
    it("should throw an error if options does not have tfData", () => {
      let task = () => {
        tfutils.testModule({});
      };
      assert.throws(task, `options must be passed with key ["tfData"] got []`);
    });
    it("should run the correct describe and test functions for plan", () => {
      let callbackDone = false;
      let options = {
        moduleName: "test",
        address: "module.test",
        tfData: {
          root_module: {
            child_modules: [
              {
                address: "module.test",
                resources: [
                  {
                    name: "test",
                    address: "module.test.test",
                    values: {
                      test: "test",
                    },
                  },
                ],
              },
            ],
          },
        },
        callback: function () {
          callbackDone = true;
        },
        testList: [
          {
            name: "test",
            address: "test",
            values: {
              test: "test",
            },
          },
        ],
      };
      tfutils.testModule(options);
      assert.deepEqual(
        itSpy.args,
        [
          ["Plan should contain the module module.test"],
          ["Module module.test should contain resource test"],
          ["test should have the correct test value"],
          ["module.test should not contain additional resources"],
        ],
        "should return correct it function were run"
      );
      assert.deepEqual(
        describeSpy.args,
        [["Module test"], ["test"]],
        "should return correct it function were run"
      );
      assert.isTrue(callbackDone, "it should execute the callback");
    });
    it("should run the correct describe and test function for apply", () => {
      let tfstate = {
        resources: [
          {
            module: "module.landing_zone",
            mode: "data",
            type: "ibm_container_cluster_versions",
            name: "cluster_versions",
            instances: [
              {
                index_key: 0,
                attributes: {
                  name: "name-one",
                },
              },
              {
                index_key: "test",
                attributes: {
                  name: "name-two",
                },
              },
            ],
          },
          {
            module: "module.landing_zone",
            mode: "data",
            type: "ibm_resource_instance",
            name: "cos",
            provider: 'provider["registry.terraform.io/ibm-cloud/ibm"]',
            instances: [],
          },
        ],
      };
      let options = {
        moduleName: "Cluster Versions",
        address:
          "module.landing_zone.data.ibm_container_cluster_versions.cluster_versions",
        tfData: tfstate,
        isApply: true,
        testList: [
          {
            name: "Cluster Versions",
            address:
              "module.landing_zone.data.ibm_container_cluster_versions.cluster_versions",
            instances: [
              {
                name: "name-one",
              },
              {
                index_key: "test",
                name: "name-two",
              },
            ],
          },
        ],
      };
      tfutils.testModule(options);
      assert.deepEqual(
        itSpy.args,
        [
          ["Plan should contain the module module.test"],
          ["Module module.test should contain resource test"],
          ["test should have the correct test value"],
          ["module.test should not contain additional resources"],
          [
            "Resource module.landing_zone.data.ibm_container_cluster_versions.cluster_versions should be in tfstate",
          ],
          [
            "Expected resource module.landing_zone.data.ibm_container_cluster_versions.cluster_versions[0] to have correct value for name.",
          ],
          [
            "Expected instance with key 0 to exist at module.landing_zone.data.ibm_container_cluster_versions.cluster_versions",
          ],
          [
            "Expected resource module.landing_zone.data.ibm_container_cluster_versions.cluster_versions[test] to have correct value for name.",
          ],
          [
            "Expected instance with key test to exist at module.landing_zone.data.ibm_container_cluster_versions.cluster_versions",
          ],
        ],
        "should return correct it function were run"
      );
      assert.deepEqual(
        describeSpy.args,
        [
          ["Module test"],
          ["test"],
          ["Cluster Versions"],
          [
            "module.landing_zone.data.ibm_container_cluster_versions.cluster_versions",
          ],
        ],
        "should return correct it function were run"
      );
    });
    it("should throw an error if no tf data", () => {
      let task = () => tfutils.testModule({ frog: "frog" });
      assert.throws(
        task,
        `options must be passed with key ["tfData"] got ["frog"]`
      );
    });
  });
});
