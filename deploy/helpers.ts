import { ethers } from "hardhat";
import { DeploymentsExtension } from "hardhat-deploy/types";
const { makeInterfaceId } = require('@openzeppelin/test-helpers')

const utils = ethers.utils;
export const labelhash = (name: string) => utils.keccak256(utils.toUtf8Bytes(name))

export async function computeInterfaceId(deployments: DeploymentsExtension, name: string) {
  const artifact = await deployments.getArtifact(name);
  const iface = new utils.Interface(artifact.abi);

  return makeInterfaceId.ERC165(
    Object.values(iface.functions).map((frag) => frag.format('sighash')),
  )
}
