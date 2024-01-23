import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, deployments } = hre
  const { deploy } = deployments
  const { deployer, owner } = await getNamedAccounts()

  const metadata = await ethers.getContract('StaticMetadataService', owner)
  const nameWrapper = await ethers.getContract('NameWrapper', owner)

  const uri = await metadata.uri(1)
  console.log(`URI is ${uri}`)

  const tx = await nameWrapper.setMetadataService(metadata.address)
  console.log(`Updating metadata of NameWrapper (${tx.hash})...`)
  await tx.wait()

  return true
}

func.id = 'update-metadata-service'
func.tags = ['UpdateMetadataService']
func.dependencies = ['StaticMetadataService', 'NameWrapper']

export default func
