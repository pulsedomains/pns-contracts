import { namehash } from 'ethers/lib/utils'
import { ethers, network } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { keccak256 } from 'js-sha3'
import { computeInterfaceId } from '../helpers'

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, deployments } = hre
  const { owner } = await getNamedAccounts()

  const registry = await ethers.getContract('ENSRegistry', owner)
  const root = await ethers.getContract('Root', owner)
  const registrar = await ethers.getContract(
    'BaseRegistrarImplementation',
    owner,
  )
  const nameWrapper = await ethers.getContract('NameWrapper', owner)
  const controller = await ethers.getContract('ETHRegistrarController', owner)
  const publicResolver = await ethers.getContract('PublicResolver', owner)
  const plsOwnedResolver = await ethers.getContract('OwnedResolver')
  const bulkRenewal = await ethers.getContract('StaticBulkRenewal')

  let tx

  const resolverHash = namehash('resolver.pls')
  const ownerOfResolver = await registry.owner(resolverHash)
  switch (ownerOfResolver) {
    case nameWrapper.address:
      tx = await nameWrapper.unwrapETH2LD(
        '0x' + keccak256('resolver'),
        owner,
        owner,
      )
      console.log(
        `Unwrap resolver.pls and transfer to owner (tx: ${tx.hash})...`,
      )
      await tx.wait(2)

    case owner:
      tx = await registry.setResolver(resolverHash, publicResolver.address)
      console.log(
        `Setting resolver for resolver.pls to PublicResolver (tx: ${tx.hash})...`,
      )
      await tx.wait()

      tx = await publicResolver['setAddr(bytes32,address)'](
        resolverHash,
        publicResolver.address,
      )
      console.log(
        `Setting address for resolver.pls to PublicResolver (tx: ${tx.hash})...`,
      )
      await tx.wait()
      break
    default:
      console.log(
        'resolver.pls is not owned by the owner address, not setting resolver',
      )
      break
  }

  const providerWithEns = new ethers.providers.StaticJsonRpcProvider(
    network.name === 'mainnet'
      ? 'https://rpc.mainnet.pulsechain.com'
      : 'https://rpc.v4.testnet.pulsechain.com',
    {
      chainId: network.name === 'mainnet' ? 369 : 943,
      name: 'pulse',
      ensAddress: registry.address,
    },
  )

  const resolver = await providerWithEns.getResolver('pls')
  if (resolver === null) {
    tx = await registrar.setResolver(plsOwnedResolver.address)
    await tx.wait()
    console.log(`No resolver set for .pls; not setting interfaces.`)
    return true
  }

  const resolverContract = await ethers.getContractAt(
    'PublicResolver',
    resolver.address,
  )

  // tx = await root.setSubnodeOwner('0x' + keccak256('pls'), owner)
  // console.log(`Temporarily setting owner of pls to owner  (tx: ${tx.hash})...`)
  // await tx.wait()

  const iNameWrapper = await computeInterfaceId(deployments, 'NameWrapper')
  tx = await resolverContract.setInterface(
    namehash('pls'),
    iNameWrapper,
    nameWrapper.address,
  )
  console.log(
    `Setting NameWrapper interface ID ${iNameWrapper} on .pls resolver (tx: ${tx.hash})...`,
  )
  await tx.wait()

  const iRegistrarController = await computeInterfaceId(
    deployments,
    'IETHRegistrarController',
  )
  tx = await resolverContract.setInterface(
    namehash('pls'),
    iRegistrarController,
    controller.address,
  )
  console.log(
    `Setting IETHRegistrarController interface ID ${iRegistrarController} on .pls resolver (tx: ${tx.hash})...`,
  )
  await tx.wait()

  const iBulkRenewal = await computeInterfaceId(deployments, 'IBulkRenewal')
  tx = await resolverContract.setInterface(
    namehash('pls'),
    iBulkRenewal,
    bulkRenewal.address,
  )
  console.log(
    `Setting BulkRenewal interface ID ${iBulkRenewal} on .pls resolver (tx: ${tx.hash})...`,
  )
  await tx.wait()

  // tx = await root.setSubnodeOwner('0x' + keccak256('pls'), registrar.address)
  // console.log(`Set owner of pls back to registrar (tx: ${tx.hash})...`)
  // await tx.wait()

  return true
}

func.id = 'final-setup'
func.tags = ['FinalSetup']
func.dependencies = [
  'ENSRegistry',
  'BaseRegistrarImplementation',
  'NameWrapper',
  'ETHRegistrarController',
  'PublicResolver',
  'OwnedResolver',
  'StaticBulkRenewal',
]

export default func
