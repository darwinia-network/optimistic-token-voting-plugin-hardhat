import buildMetadata from "../../src/main-voting-build-metadata.json";
import {
  DAO,
  OptimisticTokenVotingPlugin__factory,
  OptimisticTokenVotingPluginSetup,
  OptimisticTokenVotingPluginSetup__factory,
} from "../../typechain";
import { deployTestDao } from "../helpers/test-dao";
import { getNamedTypesFromMetadata, Operation } from "../helpers/types";
import {
  abiCoder,
  ADDRESS_ONE,
  ADDRESS_ZERO,
  EXECUTE_PERMISSION_ID,
  NO_CONDITION,
  pctToRatio,
  UPDATE_ADDRESSES_PERMISSION_ID,
  UPDATE_VOTING_SETTINGS_PERMISSION_ID,
  UPGRADE_PLUGIN_PERMISSION_ID,
  VotingMode,
} from "./common";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Main Voting Plugin Setup", function () {
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let mainVotingPluginSetup: OptimisticTokenVotingPluginSetup;
  let dao: DAO;

  before(async () => {
    [alice, bob] = await ethers.getSigners();
    dao = await deployTestDao(alice);

    mainVotingPluginSetup = await new OptimisticTokenVotingPluginSetup__factory(
      alice,
    ).deploy();
  });

  describe("prepareInstallation", async () => {
    it("returns the plugin, helpers, and permissions (no pluginUpgrader)", async () => {
      const pluginUpgrader = ADDRESS_ZERO;

      // Params: (MajorityVotingBase.VotingSettings, address, address)
      const initData = abiCoder.encode(
        getNamedTypesFromMetadata(
          buildMetadata.pluginSetup.prepareInstallation.inputs,
        ),
        [
          {
            votingMode: VotingMode.EarlyExecution,
            supportThreshold: pctToRatio(25),
            minParticipation: pctToRatio(50),
            minDuration: 60 * 60 * 24 * 5,
            minProposerVotingPower: 0,
          },
          [alice.address],
          pluginUpgrader,
        ],
      );
      const nonce = await ethers.provider.getTransactionCount(
        mainVotingPluginSetup.address,
      );
      const anticipatedPluginAddress = ethers.utils.getContractAddress({
        from: mainVotingPluginSetup.address,
        nonce,
      });

      const {
        plugin,
        preparedSetupData: { helpers, permissions },
      } = await mainVotingPluginSetup.callStatic.prepareInstallation(
        dao.address,
        initData,
      );

      expect(plugin).to.be.equal(anticipatedPluginAddress);
      expect(helpers.length).to.be.equal(0);
      expect(permissions.length).to.be.equal(4);
      expect(permissions).to.deep.equal([
        [
          Operation.Grant,
          dao.address,
          plugin,
          NO_CONDITION,
          EXECUTE_PERMISSION_ID,
        ],
        [
          Operation.Grant,
          plugin,
          dao.address,
          NO_CONDITION,
          UPDATE_VOTING_SETTINGS_PERMISSION_ID,
        ],
        [
          Operation.Grant,
          plugin,
          dao.address,
          NO_CONDITION,
          UPDATE_ADDRESSES_PERMISSION_ID,
        ],
        [
          Operation.Grant,
          plugin,
          dao.address,
          NO_CONDITION,
          UPGRADE_PLUGIN_PERMISSION_ID,
        ],
      ]);

      await mainVotingPluginSetup.prepareInstallation(dao.address, initData);
      const myPlugin = new OptimisticTokenVotingPlugin__factory(alice).attach(
        plugin,
      );

      // initialization is correct
      expect(await myPlugin.dao()).to.eq(dao.address);
      expect(await myPlugin.isEditor(alice.address)).to.be.true;
    });

    it("returns the plugin, helpers, and permissions (with a pluginUpgrader)", async () => {
      const pluginUpgrader = bob.address;

      // Params: (MajorityVotingBase.VotingSettings, address, address)
      const initData = abiCoder.encode(
        getNamedTypesFromMetadata(
          buildMetadata.pluginSetup.prepareInstallation.inputs,
        ),
        [
          {
            votingMode: VotingMode.EarlyExecution,
            supportThreshold: pctToRatio(25),
            minParticipation: pctToRatio(50),
            minDuration: 60 * 60 * 24 * 5,
            minProposerVotingPower: 0,
          },
          [alice.address],
          pluginUpgrader,
        ],
      );
      const nonce = await ethers.provider.getTransactionCount(
        mainVotingPluginSetup.address,
      );
      const anticipatedPluginAddress = ethers.utils.getContractAddress({
        from: mainVotingPluginSetup.address,
        nonce,
      });

      const {
        plugin,
        preparedSetupData: { helpers, permissions },
      } = await mainVotingPluginSetup.callStatic.prepareInstallation(
        dao.address,
        initData,
      );

      expect(plugin).to.be.equal(anticipatedPluginAddress);
      expect(helpers.length).to.be.equal(0);
      expect(permissions.length).to.be.equal(5);
      expect(permissions).to.deep.equal([
        [
          Operation.Grant,
          dao.address,
          plugin,
          NO_CONDITION,
          EXECUTE_PERMISSION_ID,
        ],
        [
          Operation.Grant,
          plugin,
          dao.address,
          NO_CONDITION,
          UPDATE_VOTING_SETTINGS_PERMISSION_ID,
        ],
        [
          Operation.Grant,
          plugin,
          dao.address,
          NO_CONDITION,
          UPDATE_ADDRESSES_PERMISSION_ID,
        ],
        [
          Operation.Grant,
          plugin,
          dao.address,
          NO_CONDITION,
          UPGRADE_PLUGIN_PERMISSION_ID,
        ],
        [
          Operation.Grant,
          plugin,
          pluginUpgrader,
          NO_CONDITION,
          UPGRADE_PLUGIN_PERMISSION_ID,
        ],
      ]);

      await mainVotingPluginSetup.prepareInstallation(dao.address, initData);
      const myPlugin = new OptimisticTokenVotingPlugin__factory(alice).attach(
        plugin,
      );

      // initialization is correct
      expect(await myPlugin.dao()).to.eq(dao.address);
      expect(await myPlugin.isEditor(alice.address)).to.be.true;
    });
  });

  describe("prepareUninstallation", async () => {
    it("returns the permissions (no pluginUpgrader)", async () => {
      const plugin = await new OptimisticTokenVotingPlugin__factory(alice)
        .deploy();

      const pluginUpgrader = ADDRESS_ZERO;
      const uninstallData = abiCoder.encode(
        getNamedTypesFromMetadata(
          buildMetadata.pluginSetup.prepareUninstallation.inputs,
        ),
        [pluginUpgrader],
      );
      const permissions = await mainVotingPluginSetup.callStatic
        .prepareUninstallation(
          dao.address,
          {
            plugin: plugin.address,
            currentHelpers: [],
            data: uninstallData,
          },
        );

      expect(permissions.length).to.be.equal(4);
      expect(permissions).to.deep.equal([
        [
          Operation.Revoke,
          dao.address,
          plugin.address,
          NO_CONDITION,
          EXECUTE_PERMISSION_ID,
        ],
        [
          Operation.Revoke,
          plugin.address,
          dao.address,
          NO_CONDITION,
          UPDATE_VOTING_SETTINGS_PERMISSION_ID,
        ],
        [
          Operation.Revoke,
          plugin.address,
          dao.address,
          NO_CONDITION,
          UPDATE_ADDRESSES_PERMISSION_ID,
        ],
        [
          Operation.Revoke,
          plugin.address,
          dao.address,
          NO_CONDITION,
          UPGRADE_PLUGIN_PERMISSION_ID,
        ],
      ]);
    });

    it("returns the permissions (no pluginUpgrader)", async () => {
      const plugin = await new OptimisticTokenVotingPlugin__factory(alice)
        .deploy();

      const pluginUpgrader = bob.address;
      const uninstallData = abiCoder.encode(
        getNamedTypesFromMetadata(
          buildMetadata.pluginSetup.prepareUninstallation.inputs,
        ),
        [pluginUpgrader],
      );
      const permissions = await mainVotingPluginSetup.callStatic
        .prepareUninstallation(
          dao.address,
          {
            plugin: plugin.address,
            currentHelpers: [],
            data: uninstallData,
          },
        );

      expect(permissions.length).to.be.equal(5);
      expect(permissions).to.deep.equal([
        [
          Operation.Revoke,
          dao.address,
          plugin.address,
          NO_CONDITION,
          EXECUTE_PERMISSION_ID,
        ],
        [
          Operation.Revoke,
          plugin.address,
          dao.address,
          NO_CONDITION,
          UPDATE_VOTING_SETTINGS_PERMISSION_ID,
        ],
        [
          Operation.Revoke,
          plugin.address,
          dao.address,
          NO_CONDITION,
          UPDATE_ADDRESSES_PERMISSION_ID,
        ],
        [
          Operation.Revoke,
          plugin.address,
          dao.address,
          NO_CONDITION,
          UPGRADE_PLUGIN_PERMISSION_ID,
        ],
        [
          Operation.Revoke,
          plugin.address,
          pluginUpgrader,
          NO_CONDITION,
          UPGRADE_PLUGIN_PERMISSION_ID,
        ],
      ]);
    });
  });
});
